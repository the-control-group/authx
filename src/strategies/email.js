import jjv from 'jjv';
import jwt from 'jsonwebtoken';
import Handlebars from 'handlebars';
import json from '../util/json';
import form from '../util/form';
import * as errors from '../errors';

import Strategy from '../Strategy';
import Credential from '../models/Credential';
import User from '../models/User';

var env = jjv();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		expiresIn: {
			type: 'number',
			default: 900
		},
		subject: {
			type: ['null', 'string'],
			title: 'Email Subject',
			description: 'Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`.'
		},
		text: {
			type: ['null', 'string'],
			title: 'Email Plain Text Body',
			description: 'Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`.'
		},
		html: {
			type: ['null', 'string'],
			title: 'Email HTML Body',
			description: 'Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`.'
		}
	}
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {}
});

export default class EmailStrategy extends Strategy {

	async authenticate(ctx) {
		ctx.redirect_to = ctx.query.url;
		var request = ctx.query;


		// HTTP POST (json)
		if (ctx.method === 'POST' && ctx.is('application/json'))
			request = await json(ctx.req);


		// HTTP POST (form)
		else if (ctx.method === 'POST' && ctx.is('application/x-www-form-urlencoded'))
			request = await form(ctx.req);



		// check for token in the request; if we find one then the user has already received an email
		// and has clicked the link containing the token
		if (request.token) {
			let token;

			ctx.app.config.session_token.public.some(pub => {
				try {
					return token = jwt.verify(request.token, pub.key, {
						algorithms: [pub.algorithm],
						audience: ctx.app.config.realm + ':session.' + this.authority.id,
						issuer: ctx.app.config.realm + ':session.' + this.authority.id
					});
				} catch (err) { return; }
			});


			if (!token)
				throw new errors.AuthenticationError('The supplied token is invalid or expired.');


			// get the credential
			var credential = await Credential.get(this.conn, token.sub);


			if(new Date(credential.last_used) > new Date(token.iat))
				throw new errors.AuthenticationError('This credential has been used since the token was issued.');


			var [user] = await Promise.all([

				// get the user
				User.get(this.conn, credential.user_id),

				// update the credential's last_used timestamp
				credential.update({ last_used: Date.now() / 1000 })
			]);

			// return the user
			return user;
		}


		// check for an email address in the request; if we find one then we need to generate a token
		// and send the user a link by email
		else if (request.email) {
			let credential = await Credential.get(this.conn, [this.authority.id, request.email]);


			// generate token from user
			let token = jwt.sign({}, ctx.app.config.session_token.private_key, {
				algorithm: ctx.app.config.session_token.algorithm,
				expiresIn: this.authority.expiresIn,
				audience: ctx.app.config.realm + ':session.' + this.authority.id,
				subject: credential.id,
				issuer: ctx.app.config.realm + ':session.' + this.authority.id
			});

			let templateContext = {
				token: token,
				credential: credential,
				url: ctx.request.href + (ctx.request.href.includes('?') ? '&' : '?') + 'token=' + token
			};


			// send the token in an email
			await ctx.app.mail({
				to: request.email,
				subject: Handlebars.compile(this.authority.details.subject || 'Authenticate by email')(templateContext),
				text: Handlebars.compile(this.authority.details.text || 'Please authenticate at the following URL: {{{url}}}')(templateContext),
				html: Handlebars.compile(this.authority.details.html || 'Please click <a href="{{url}}">here</a> to authenticate.')(templateContext)
			});

			ctx.status = 202;
			ctx.body = {message: 'Token sent to "' + request.email + '".'};

		}


		// this isn't a valid request
		else
			throw new errors.ValidationError('You must send an email address or token.');

	}



	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('authority', data, {useDefault: true});
		if(err) throw new errors.ValidationError('The authority details were invalid.', err.validation);

		return Strategy.createAuthority.call(this, conn, data);
	}



	static async updateAuthority(authority, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('authority', delta, {useDefault: true});
		if(err) throw new errors.ValidationError('The authority details were invalid.', err.validation);

		return Strategy.updateAuthority.call(this, authority, delta);
	}



	// Credential Methods
	// ------------------

	async createCredential(data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('credential', data, {useDefault: true});
		if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);

		return Strategy.prototype.createCredential.call(this, data);
	}



	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('credential', delta, {useDefault: true});
		if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}

}
