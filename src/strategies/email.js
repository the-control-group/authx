const jjv = require('jjv');
const jwt = require('jsonwebtoken');
const Handlebars = require('handlebars');
const json = require('../util/json');
const form = require('../util/form');
const nodemailer = require('nodemailer');
const errors = require('../errors');
const { can } = require('../util/protect');
const x = require('../namespace');

const Strategy = require('../Strategy');
const Credential = require('../models/Credential');
const User = require('../models/User');

const env = jjv();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		expiresIn: {
			type: 'number',
			default: 900
		},
		authentication_email_subject: {
			type: ['null', 'string'],
			title: 'Authentication Email Subject',
			description:
				'Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`.',
			default: 'Authenticate by email'
		},
		authentication_email_text: {
			type: ['null', 'string'],
			title: 'Authentication Email Plain Text Body',
			description:
				'Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`.',
			default: 'Please authenticate at the following URL: {{{url}}}'
		},
		authentication_email_html: {
			type: ['null', 'string'],
			title: 'Authentication Email HTML Body',
			description:
				'Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`.',
			default: 'Please click <a href="{{url}}">here</a> to authenticate.'
		},
		verification_email_subject: {
			type: ['null', 'string'],
			title: 'Verification Email Subject',
			description:
				'Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`.',
			default: 'Verify email'
		},
		verification_email_text: {
			type: ['null', 'string'],
			title: 'Verification Email Plain Text Body',
			description:
				'Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`.',
			default: 'Please verify this email at the following URL: {{{url}}}'
		},
		verification_email_html: {
			type: ['null', 'string'],
			title: 'Verification Email HTML Body',
			description:
				'Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`.',
			default: 'Please click <a href="{{url}}">here</a> to verify this email.'
		},
		mailer: {
			type: 'object',
			default: {
				transport: null,
				auth: {},
				defaults: {}
			},
			properties: {
				transport: {
					type: ['null', 'string'],
					default: null
				},
				auth: {
					type: 'object',
					default: {}
				},
				defaults: {
					type: 'object',
					default: {}
				}
			}
		}
	}
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {}
});

module.exports = class EmailStrategy extends Strategy {
	async authenticate(ctx) {
		ctx.redirect_to = ctx.query.url;
		var request = ctx.query;

		// HTTP POST (json)
		if (ctx.method === 'POST' && ctx.is('application/json'))
			request = await json(ctx.req);
		// HTTP POST (form)
		else if (
			ctx.method === 'POST' &&
			ctx.is('application/x-www-form-urlencoded')
		)
			request = await form(ctx.req);

		// check for token in the request; if we find one then the user has already received an email
		// and has clicked the link containing the token
		if (request.token) {
			let token;

			ctx[x].authx.config.session_token.public.some(pub => {
				try {
					return (token = jwt.verify(request.token, pub.key, {
						algorithms: [pub.algorithm],
						audience:
							ctx[x].authx.config.realm + ':session.' + this.authority.id,
						issuer: ctx[x].authx.config.realm + ':session.' + this.authority.id
					}));
				} catch (err) {
					return;
				}
			});

			if (!token)
				throw new errors.AuthenticationError(
					'The supplied token is invalid or expired.'
				);

			// credential token
			if (token.sub[0] === 'credential') {
				// get the credential
				const credential = await Credential.get(this.conn, token.sub[1]);

				if (ctx[x].user && ctx[x].user.id !== credential.user_id)
					throw new errors.AuthenticationError(
						'This email is associated with a different user.'
					);

				if (new Date(credential.last_used) > new Date(token.iat))
					throw new errors.AuthenticationError(
						'This credential has been used since the token was issued.'
					);

				const [user] = await Promise.all([
					// get the user
					User.get(this.conn, credential.user_id),

					// update the credential's last_used timestamp
					credential.update({ last_used: Date.now() / 1000 })
				]);

				// return the user
				return user;
			}

			// user token
			if (token.sub[0] === 'user') {
				let user = ctx[x].user;
				let tokenUserId = token.sub[1];
				let tokenEmail = token.sub[2];

				// no user is currently logged-in, so we won't try to associate a new email
				if (!user)
					throw new errors.AuthenticationError(
						'A new credential cannot be created because no user is currently logged in.'
					);

				// verify that the logged-in user matches the intended user
				if (user.id !== tokenUserId)
					throw new errors.AuthenticationError(
						'A new credential cannot be created because the logged-in user does not match the intended user.'
					);

				// verify that the user is permitted to add an email
				if (
					!can(
						ctx,
						ctx[x].authx.config.realm +
							':credential.' +
							this.authority.id +
							'.me' +
							':create'
					)
				)
					throw new errors.ForbiddenError(
						`You are not permitted to create a new ${
							this.authority.name
						} credential for yourself.`
					);

				// add a new credential
				await Credential.create(this.conn, {
					id: [this.authority.id, tokenEmail],
					user_id: user.id,
					last_used: Date.now(),
					profile: null
				});

				return user;
			}

			throw new errors.AuthenticationError(
				'The supplied token subject is not supported.'
			);
		}

		// check for an email address in the request; if we find one then we need to generate a token
		// and send the user a link by email
		else if (request.email)
			try {
				let credential = await Credential.get(this.conn, [
					this.authority.id,
					request.email
				]);

				// generate token from user
				let token = jwt.sign(
					{},
					ctx[x].authx.config.session_token.private_key,
					{
						algorithm: ctx[x].authx.config.session_token.algorithm,
						expiresIn: this.authority.expiresIn,
						audience:
							ctx[x].authx.config.realm + ':session.' + this.authority.id,
						subject: ['credential', credential.id],
						issuer: ctx[x].authx.config.realm + ':session.' + this.authority.id
					}
				);

				let templateContext = {
					token: token,
					credential: credential,
					url:
						ctx.request.href +
						(ctx.request.href.includes('?') ? '&' : '?') +
						'token=' +
						token
				};

				// send the token in an email
				await this.mail({
					to: request.email,
					subject: Handlebars.compile(
						this.authority.details.authentication_email_subject
					)(templateContext),
					text: Handlebars.compile(
						this.authority.details.authentication_email_text
					)(templateContext),
					html: Handlebars.compile(
						this.authority.details.authentication_email_html
					)(templateContext)
				});

				ctx.status = 202;
				ctx.body = { message: 'Token sent to "' + request.email + '".' };
			} catch (err) {
				// this is an unexpected error
				if (!(err instanceof errors.NotFoundError)) throw err;

				// no user is currently logged-in, so we can't try to associate a new email
				if (!ctx[x].user) throw err;

				// the user is not permitted to add an email
				if (
					!can(
						ctx,
						ctx[x].authx.config.realm +
							':credential.' +
							this.authority.id +
							'.me' +
							':create'
					)
				)
					throw new errors.ForbiddenError(
						`You are not permitted to create a new ${
							this.authority.name
						} credential for yourself.`
					);

				// generate token from user
				let token = jwt.sign(
					{},
					ctx[x].authx.config.session_token.private_key,
					{
						algorithm: ctx[x].authx.config.session_token.algorithm,
						expiresIn: this.authority.expiresIn,
						audience:
							ctx[x].authx.config.realm + ':session.' + this.authority.id,
						subject: ['user', ctx[x].user.id, request.email],
						issuer: ctx[x].authx.config.realm + ':session.' + this.authority.id
					}
				);

				let templateContext = {
					token: token,
					user: ctx[x].user,
					url:
						ctx.request.href +
						(ctx.request.href.includes('?') ? '&' : '?') +
						'token=' +
						token
				};

				// send the token in an email
				await this.mail({
					to: request.email,
					subject: Handlebars.compile(
						this.authority.details.verification_email_subject
					)(templateContext),
					text: Handlebars.compile(
						this.authority.details.verification_email_text
					)(templateContext),
					html: Handlebars.compile(
						this.authority.details.verification_email_html
					)(templateContext)
				});

				ctx.status = 202;
				ctx.body = { message: 'Token sent to "' + request.email + '".' };
			}
		// this isn't a valid request
		else
			throw new errors.ValidationError(
				'You must send an email address or token.'
			);
	}

	async mail(message) {
		const config = this.authority.details.mailer;

		// stub out a transporter if none is specified
		const transport = config.transport
			? nodemailer.createTransport(config.transport)
			: {
					sendMail: (message, cb) => {
						console.warn(
							'Email transport is not set up; message not sent:',
							message
						);
						cb(null, message);
					}
			  };

		// wrap nodemailer in a promise
		return new Promise((resolve, reject) => {
			message = Object.assign({}, config.defaults, message);
			transport.sendMail(message, (err, res) => {
				if (err) return reject(err);
				return resolve(res);
			});
		});
	}

	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		const err = env.validate('authority', data, { useDefault: true });
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
		const err = env.validate('authority', delta, { useDefault: true });
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
		const err = env.validate('credential', data, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The credential details were invalid.',
				err.validation
			);

		return Strategy.prototype.createCredential.call(this, data);
	}

	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		const err = env.validate('credential', delta, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The credential details were invalid.',
				err.validation
			);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}
};
