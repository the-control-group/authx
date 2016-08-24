'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _handlebars = require('handlebars');

var _handlebars2 = _interopRequireDefault(_handlebars);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _namespace = require('../namespace');

var _namespace2 = _interopRequireDefault(_namespace);

var _Strategy = require('../Strategy');

var _Strategy2 = _interopRequireDefault(_Strategy);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const env = (0, _jjv2.default)();

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

class EmailStrategy extends _Strategy2.default {

	authenticate(ctx) {
		var _this = this;

		var request, token, credential, _ref, _ref2, user, templateContext;

		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					ctx.redirect_to = ctx.query.url;
					request = ctx.query;

					// HTTP POST (json)

					if (!(ctx.method === 'POST' && ctx.is('application/json'))) {
						_context.next = 8;
						break;
					}

					_context.next = 5;
					return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

				case 5:
					request = _context.sent;
					_context.next = 12;
					break;

				case 8:
					if (!(ctx.method === 'POST' && ctx.is('application/x-www-form-urlencoded'))) {
						_context.next = 12;
						break;
					}

					_context.next = 11;
					return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

				case 11:
					request = _context.sent;

				case 12:
					if (!request.token) {
						_context.next = 29;
						break;
					}

					ctx[_namespace2.default].authx.config.session_token.public.some(function (pub) {
						try {
							return token = _jsonwebtoken2.default.verify(request.token, pub.key, {
								algorithms: [pub.algorithm],
								audience: ctx[_namespace2.default].authx.config.realm + ':session.' + _this.authority.id,
								issuer: ctx[_namespace2.default].authx.config.realm + ':session.' + _this.authority.id
							});
						} catch (err) {
							return;
						}
					});

					if (token) {
						_context.next = 16;
						break;
					}

					throw new errors.AuthenticationError('The supplied token is invalid or expired.');

				case 16:
					_context.next = 18;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, token.sub));

				case 18:
					credential = _context.sent;

					if (!(new Date(credential.last_used) > new Date(token.iat))) {
						_context.next = 21;
						break;
					}

					throw new errors.AuthenticationError('This credential has been used since the token was issued.');

				case 21:
					_context.next = 23;
					return regeneratorRuntime.awrap(Promise.all([

					// get the user
					_User2.default.get(this.conn, credential.user_id),

					// update the credential's last_used timestamp
					credential.update({ last_used: Date.now() / 1000 })]));

				case 23:
					_ref = _context.sent;
					_ref2 = _slicedToArray(_ref, 1);
					user = _ref2[0];

					// return the user

					return _context.abrupt('return', user);

				case 29:
					if (!request.email) {
						_context.next = 41;
						break;
					}

					_context.next = 32;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, request.email]));

				case 32:
					credential = _context.sent;


					// generate token from user
					token = _jsonwebtoken2.default.sign({}, ctx[_namespace2.default].authx.config.session_token.private_key, {
						algorithm: ctx[_namespace2.default].authx.config.session_token.algorithm,
						expiresIn: this.authority.expiresIn,
						audience: ctx[_namespace2.default].authx.config.realm + ':session.' + this.authority.id,
						subject: credential.id,
						issuer: ctx[_namespace2.default].authx.config.realm + ':session.' + this.authority.id
					});
					templateContext = {
						token: token,
						credential: credential,
						url: ctx.request.href + (ctx.request.href.includes('?') ? '&' : '?') + 'token=' + token
					};

					// send the token in an email

					_context.next = 37;
					return regeneratorRuntime.awrap(this.mail({
						to: request.email,
						subject: _handlebars2.default.compile(this.authority.details.subject || 'Authenticate by email')(templateContext),
						text: _handlebars2.default.compile(this.authority.details.text || 'Please authenticate at the following URL: {{{url}}}')(templateContext),
						html: _handlebars2.default.compile(this.authority.details.html || 'Please click <a href="{{url}}">here</a> to authenticate.')(templateContext)
					}));

				case 37:

					ctx.status = 202;
					ctx.body = { message: 'Token sent to "' + request.email + '".' };

					_context.next = 42;
					break;

				case 41:
					throw new errors.ValidationError('You must send an email address or token.');

				case 42:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	mail(message) {
		var config, transport;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					config = this.authority.details.mailer;

					// stub out a transporter if none is specified

					transport = config.transport ? _nodemailer2.default.createTransport(config.transport) : { sendMail: function (message, cb) {
							console.warn('Email transport is not set up; message not sent:', message);
							cb(null, message);
						} };

					// wrap nodemailer in a promise

					return _context2.abrupt('return', new Promise(function (resolve, reject) {
						message = Object.assign({}, config.defaults, message);
						transport.sendMail(message, function (err, res) {
							if (err) return reject(err);
							return resolve(res);
						});
					}));

				case 3:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data.details = data.details || {};

					// validate data
					err = env.validate('authority', data, { useDefault: true });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 4:
					return _context3.abrupt('return', _Strategy2.default.createAuthority.call(this, conn, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		var err;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					delta.details = delta.details || {};

					// validate data
					err = env.validate('authority', delta, { useDefault: true });

					if (!err) {
						_context4.next = 4;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 4:
					return _context4.abrupt('return', _Strategy2.default.updateAuthority.call(this, authority, delta));

				case 5:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		var err;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					data.details = data.details || {};

					// validate data
					err = env.validate('credential', data, { useDefault: true });

					if (!err) {
						_context5.next = 4;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 4:
					return _context5.abrupt('return', _Strategy2.default.prototype.createCredential.call(this, data));

				case 5:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		var err;
		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:
					delta.details = delta.details || {};

					// validate data
					err = env.validate('credential', delta, { useDefault: true });

					if (!err) {
						_context6.next = 4;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 4:
					return _context6.abrupt('return', _Strategy2.default.prototype.updateCredential.call(this, credential, delta));

				case 5:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

}
exports.default = EmailStrategy;