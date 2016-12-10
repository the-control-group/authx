const jjv = require('jjv');
const request = require('request-promise');
const { IdentityProvider, ServiceProvider } = require('saml2-js');
const errors = require('../errors');
const form = require('../util/form');
const { can } = require('../util/protect');
const profileSchema = require('../../schema/profile');

const Strategy = require('../Strategy');
const Credential = require('../models/Credential');
const Role = require('../models/Role');
const User = require('../models/User');

const x = require('../namespace');

var env = jjv();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		service_provider: {
			type: 'object',
			title: 'Service Provider',
			additionalProperties: false,
			properties: {
				private_key: {
					type: 'string',
					title: 'Provate Key',
					description: 'The private key (as a PEM format string) used by this service provider.'
				},
				certificate: {
					type: 'string',
					title: 'Certificate',
					description: 'The certificate (as a PEM format string) corresponding to this service provide\'s private key.'
				},
				force_authn: {
					type: 'boolean',
					title: 'Force Re-Authentication',
					description: 'If true, forces re-authentication of users even if the user has a SSO session with the IdP.'
				},
				alt_private_keys: {
					type: 'array',
					title: 'Alternative Private Keys',
					description: '(Array of PEM format strings) - Additional private keys to use when attempting to decrypt responses. Useful for adding backward-compatibility for old certificates after a rollover.',
					minItems: 1,
					uniqueItems: true,
					items: {
						type: 'string'
					}
				},
				alt_certs: {
					type: 'array',
					title: 'Alternative Certificates',
					description: '(Array of PEM format strings) - Additional certificates to expose in the SAML metadata. Useful for staging new certificates for rollovers.',
					minItems: 1,
					uniqueItems: true,
					items: {
						type: 'string'
					}
				}
			},
			required: [
				'private_key',
				'certificate'
			]
		},
		identity_provider: {
			type: 'object',
			title: 'Identity Provider',
			additionalProperties: false,
			properties: {
				sso_login_url: {
					type: 'string',
					title: 'Login URL'
				},
				sso_logout_url: {
					type: 'string',
					title: 'Logout URL'
				},
				certificates: {
					type: 'array',
					title: 'Certificates',
					minItems: 1,
					uniqueItems: true,
					items: {
						type: 'string'
					}
				}
			},
			required: [
				'sso_login_url',
				'sso_logout_url',
				'certificates'
			]
		},
		client_id: {
			type: 'string',
			title: 'Client Id',
			description: 'The OneLogin client id for API access.'
		},
		client_secret: {
			type: 'string',
			title: 'Client Secret',
			description: 'The OneLogin client secret for API access.'
		},
		email_authority_id: {
			type: ['null', 'string'],
			title: 'Email Authority ID',
			description: 'The ID of an email authority with which verified email addresses can be registered.',
			default: null
		}
	},
	required: [
		'private_key',
		'certificate',
		'identity_provider',
		'client_id',
		'client_secret'
	]
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {}
});

env.addSchema(profileSchema);

function without(o, key) {
	o = Object.assign({}, o);
	delete o[key];
	return o;
}


module.exports = class OAuth2Strategy extends Strategy {

	async authenticate(ctx) {


		// instantiate the SAML identity provider
		const idp = new IdentityProvider(this.authority.details.identity_provider);

		// instantiate the SAML service provider
		const sp = new ServiceProvider({
			entity_id: ctx.request.protocol + '://' + ctx.request.host + ctx.request.path + '?metadata',
			assert_endpoint: ctx.request.protocol + '://' + ctx.request.host + ctx.request.path,
			sign_get_request: true,
			allow_unencrypted_assertion: false,
			private_key: this.authority.details.service_provider.private_key,
			certificate: this.authority.details.service_provider.certificate,
			alt_private_keys: this.authority.details.service_provider.alt_private_keys,
			alt_certs: this.authority.details.service_provider.alt_certs
		});



		// Complete Authorization Request
		// ------------------------------


		if (ctx.method === 'POST') {

			// retrieve the url from the cookie
			ctx.redirect_to = ctx.cookies.get('AuthX/session/' + this.authority.id + '/url');
			ctx.cookies.set('AuthX/session/' + this.authority.id + '/url');


			let body = await form(ctx.req);

			let response = await new Promise((resolve, reject) => {
				sp.post_assert(idp, {request_body: body, ignore_signature: true}, function(err, response) {
					if (err) return reject(err);
					resolve(response);
				});
			});



			// TODO: get the user's profile from the OneLogin API
			let profile = {
				id: response.user.name_id,
				displayName: ''
			};


			let credential, user, details = {};


			// look for an existing credential by ID
			try {
				credential = await Credential.update(this.conn, [this.authority.id, response.user.name_id], {
					details: details,
					profile: profile,
					last_used: Date.now()
				});

				// if already logged in, make sure this credential belongs to the logged-in user
				if (ctx[x].user && ctx[x].user.id !== credential.user_id)
					throw new errors.ConflictError(`This ${this.authority.name} credential is associated with a different user.`);

				user = await User.get(this.conn, credential.user_id);

			} catch (err) { if (!(err instanceof errors.NotFoundError)) throw err; }



			// TODO: lookup customer by verified email


			// this account is not yet associated with our system
			if (!credential) {

				// associate with the logged-in user
				if (ctx[x].user) {

					// make sure the logged-in user is allowed to add credentials
					if (!can(ctx, ctx[x].authx.config.realm + ':credential.' + this.authority.id + '.me' +  ':create'))
						throw new errors.ForbiddenError(`You are not permitted to create a new ${this.authority.name} credential for yourself.`);

					user = ctx[x].user;
				}

				// create a new user account
				else user = await User.create(this.conn, {
					type: 'human',
					profile: without(profile, 'id')
				});

				// create a new credential
				credential = await Credential.create(this.conn, {
					id: [this.authority.id, response.user.name_id],
					user_id: user.id,
					last_used: Date.now(),
					details: details,
					profile: profile
				});

				// TODO: create a new email credential

				// TODO: assign the user to all configured roles

			}


			return user;
		}



		// Metadata Request
		// ----------------

		else if (typeof ctx.query.metadata !== 'undefined') {
			ctx.body = sp.create_metadata();
		}



		// New Authorization Request
		// -------------------------

		else {


			// store the url in a cookie
			ctx.cookies.set('AuthX/session/' + this.authority.id + '/url', ctx.query.url);


			let url = await new Promise((resolve, reject) => {
				sp.create_login_request_url(idp, {}, function(err, loginUrl) {
					if (err) return reject(err);
					resolve(loginUrl);
				});
			});

			// redirect the user to the identity provider
			ctx.redirect(url);

		}

	}



	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('authority', data.details, {useDefault: true});
		if(err) throw new errors.ValidationError('The authority details were invalid.', err.validation);

		return Strategy.createAuthority.call(this, conn, data);
	}



	static async updateAuthority(authority, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('authority', delta.details, {useDefault: true});
		if(err) throw new errors.ValidationError('The authority details were invalid.', err.validation);

		return Strategy.updateAuthority.call(this, authority, delta);
	}



	// Credential Methods
	// ------------------

	async createCredential(data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('credential', data.details, {useDefault: true});
		if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);

		return Strategy.prototype.createCredential.call(this, data);
	}



	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('credential', delta.details, {useDefault: true});
		if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}

};
