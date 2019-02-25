const jwt = require('jsonwebtoken');
const jjv = require('jjv');
const auth = require('basic-auth');
const json = require('../util/json');
const form = require('../util/form');
const { hash, compare } = require('../util/bcrypt');
const errors = require('../errors');
const x = require('../namespace');

const Strategy = require('../Strategy');
const Credential = require('../models/Credential');
const User = require('../models/User');

var env = jjv();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		rounds: {
			type: 'number',
			title: 'BCrypt Rounds',
			description:
				'BCrypt encryption rounds for new secrets; old secrets will continue to use their original number of rounds.',
			default: 4
		}
	}
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {
		secret: {
			type: 'string',
			title: 'Secret',
			description:
				"The user's secret, sent as plain text; stored as a bcrypt hash."
		}
	}
});

module.exports = class SecretStrategy extends Strategy {
	async authenticate(ctx) {
		ctx.redirect_to = ctx.query.url;
		var request;

		// HTTP POST (json)
		if (ctx.method === 'POST' && ctx.is('application/json'))
			request = await json(ctx.req);
		// HTTP POST (form)
		else if (
			ctx.method === 'POST' &&
			ctx.is('application/x-www-form-urlencoded')
		)
			request = await form(ctx.req);
		// HTTP Basic Authentication
		else {
			let basic = auth(ctx.req);
			if (basic)
				request = {
					user_id: basic.name,
					secret: basic.pass
				};
		}

		// send authenticate headers
		if (!request) {
			ctx.set(
				'WWW-Authenticate',
				'Basic realm="' + ctx[x].authx.config.realm + '"'
			);
			ctx.throw(401, 'HTTP Basic credentials are required.');
		}

		// get the user ID
		var user_id = request.user_id;
		if (!user_id) ctx.throw(400, 'The `user_id` must be specified.');

		// validate the secret
		var secret = request.secret;
		if (!secret) ctx.throw(400, 'The `secret` must be specified.');

		// get the user's secret credential
		var credential = await Credential.get(this.conn, [
			this.authority.id,
			user_id
		]);

		// validate secret
		if (!(await compare(secret, credential.details.secret))) {
			ctx.set('WWW-Authenticate', 'Basic realm="authx"');
			ctx.throw(401, 'Incorrect secret.');
		}

		var [user] = await Promise.all([
			// get the user
			User.get(this.conn, user_id),

			// update the credential's last_used timestamp
			credential.update({ last_used: Date.now() / 1000 })
		]);

		// generate the access token
		var access_token = jwt.sign(
			{
				type: 'access_token',
				scopes: await user.scopes()
			},
			ctx[x].authx.config.access_token.private_key,
			{
				algorithm: ctx[x].authx.config.access_token.algorithm,
				expiresIn: ctx[x].authx.config.access_token.expiresIn,
				audience: user.id,
				subject: user.id,
				issuer: ctx[x].authx.config.realm
			}
		);

		// instead of creating a session, this strategy provides first-party access tokens to the user
		ctx.status = 200;
		ctx.body = {
			access_token: access_token
		};

		// don't create a session
		return null;
	}

	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('authority', data.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The authority details were invalid.',
				err.validation
			);

		return Strategy.createAuthority.call(this, conn, data);
	}

	static async updateAuthority(authority, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('authority', delta.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The authority details were invalid.',
				err.validation
			);

		return Strategy.updateAuthority.call(this, authority, delta);
	}

	// Credential Methods
	// ------------------

	async createCredential(data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('credential', data.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The credential details were invalid.',
				err.validation
			);

		// hash the secret
		data.details.secret = await hash(
			data.details.secret,
			this.authority.details.rounds
		);

		return Strategy.prototype.createCredential.call(this, data);
	}

	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('credential', delta.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The credential details were invalid.',
				err.validation
			);

		// hash the secret
		if (delta.details.secret)
			delta.details.secret = await hash(
				delta.details.secret,
				this.authority.details.rounds
			);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}
};
