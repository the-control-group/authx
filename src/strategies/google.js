import qs from 'querystring';
import jjv from 'jjv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import request from 'request-promise';
import * as errors from '../errors';
import profileSchema from '../../schema/profile';

import Strategy from '../Strategy';
import Credential from '../models/Credential';
import Role from '../models/Role';
import User from '../models/User';

var env = jjv();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		client_id: {
			type: 'string',
			title: 'Client ID'
		},
		client_secret: {
			type: 'string',
			title: 'Client Secret'
		},
		email_authority_id: {
			type: ['null', 'string'],
			title: 'Email Authority ID',
			description: 'The ID of an email authority with which verified email addresses can be registered.',
			default: null
		},
		email_domains: {
			type: ['null', 'object'],
			title: 'Email Domains',
			description: 'Restrict creation of new users to these domain names. If null, all domains are allowed.',
			additionalProperties: {
				type: 'array',
				title: 'Domain Role IDs',
				description: 'The IDs of AuthX roles to assign any users verified with this domain.',
				items: {
					type: 'string'
				}
			},
			default: null
		},
		role_ids: {
			type: 'array',
			title: 'Role IDs',
			description: 'The IDs of AuthX roles to assign any users verified by this authority.',
			default: []
		}
	},
	required: [
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


export default class OAuth2Strategy extends Strategy {

	async authenticate(ctx) {



		// Complete Authorization Request
		// ------------------------------


		if (ctx.query.code) {

			// retrieve the url from the cookie
			ctx.redirect_to = ctx.cookies.get('AuthX/session/' + this.authority.id + '/url');
			ctx.cookies.set('AuthX/session/' + this.authority.id + '/url');

			// retreive the state from the cookie
			let state = ctx.cookies.get('AuthX/session/' + this.authority.id + '/state');
			if (ctx.query.state !== state)
				throw new errors.ValidationError('Mismatched state parameter.');


			// get an oauth access token & details
			let response = JSON.parse(await request({
				method: 'POST',
				uri: 'https://www.googleapis.com/oauth2/v3/token',
				form: {
					client_id: this.authority.details.client_id,
					client_secret: this.authority.details.client_secret,
					redirect_uri: ctx.request.protocol + '://' + ctx.request.host + ctx.request.path,
					grant_type: 'authorization_code',
					code: ctx.query.code,
					state: state
				}
			}));


			// get the user's profile from the Google+ API
			let profile = JSON.parse(await request({
				method: 'GET',
				uri: 'https://www.googleapis.com/plus/v1/people/me',
				headers: {
					'Authorization': 'Bearer ' + response.access_token
				}
			}));



			// normalize the profile with our schema
			if(profile.url && !profile.urls)
				profile.urls = [{value: profile.url}];

			if(profile.image && profile.image.url && !profile.photos)
				profile.photos = [{value: profile.image.url}];

			var err = env.validate('profile', profile, {removeAdditional: true});
			if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);



			// TODO: right now we aren't verifying any of the JWT's assertions! We need to get Google's public
			// keys from https://www.googleapis.com/oauth2/v1/certs (because they change every day or so) and
			// use them to check the JWT's signature. What we're doing here isn't exactly best practice, but the
			// verification step isn't necessary because we just received the token directly (and securely) from
			// Google.

			// decode the JWT
			let details = jwt.decode(response.id_token);



			let credential, user, role_ids = this.authority.details.role_ids;


			// check that the email domain is whitelisted
			if (this.authority.details.email_domains !== null) {
				let parts = details.email.split('@');
				let domain = parts[parts.length - 1];

				if(!Array.isArray(this.authority.details.email_domains[domain]))
					throw new errors.AuthenticationError('The email domain "' + parts[parts.length - 1] + '" is not allowed.');

				// add role_ids specific to the email domain
				role_ids = role_ids
					.concat(this.authority.details.email_domains[domain])
					.reduce((reduction, role_id) => {
						if (reduction.indexOf(role_id) < 0) reduction.push(role_id);
						return reduction;
					});

			}


			// look for an existing credential by ID
			try {
				credential = await Credential.update(this.conn, [this.authority.id, details.sub], {
					details: details,
					profile: profile
				});
				user = await User.get(this.conn, credential.user_id);
			} catch (err) { if (!(err instanceof errors.NotFoundError)) throw err; }



			// lookup customer by verified email
			if (!credential
				&& this.authority.details.email_authority_id
				&& details.email
				&& details.email_verified
			) try {
				let email_credential = await Credential.get(this.conn, [this.authority.details.email_authority_id, details.email]);
				user = await User.get(this.conn, email_credential.user_id);

				// create a new credential
				credential = await Credential.create(this.conn, {
					id: [this.authority.id, details.sub],
					user_id: email_credential.user_id,
					details: details,
					profile: profile
				});

				// assign the user to all configured roles
				let assignments = {}; assignments[user.id] = true;
				await Promise.all(role_ids.map(id => Role.update(this.conn, id, {
					assignments: assignments
				})));

			} catch (err) { if (!(err instanceof errors.NotFoundError)) throw err; }



			// create a brand-new user
			if (!credential) {

				// create a new user account
				user = await User.create(this.conn, {
					type: 'human',
					profile: without(profile, 'id')
				});

				// create a new credential
				credential = await Credential.create(this.conn, {
					id: [this.authority.id, details.sub],
					user_id: user.id,
					details: details,
					profile: profile
				});

				// create a new email credential
				if (this.authority.details.email_authority_id) {
					await Credential.create(this.conn, {
						id: [this.authority.details.email_authority_id, details.email],
						user_id: user.id,
						profile: null
					});
				}

				// assign the user to all configured roles
				let assignments = {}; assignments[user.id] = true;
				await Promise.all(role_ids.map(id => Role.update(this.conn, id, {
					assignments: assignments
				})));
			}


			return user;
		}



		// New Authorization Request
		// -------------------------

		else {

			// store the url in a cookie
			ctx.cookies.set('AuthX/session/' + this.authority.id + '/url', ctx.query.url);

			// store the state in a cookie
			let state = crypto.randomBytes(32).toString('base64');
			ctx.cookies.set('AuthX/session/' + this.authority.id + '/state', state);

			// redirect the user to the authorization provider
			ctx.redirect('https://accounts.google.com/o/oauth2/auth?' + qs.stringify({
				client_id: this.authority.details.client_id,
				redirect_uri: ctx.request.protocol + '://' + ctx.request.host + ctx.request.path,
				response_type: 'code',
				scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
				state: state
			}));

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

}
