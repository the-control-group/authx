'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _basicAuth = require('basic-auth');

var _basicAuth2 = _interopRequireDefault(_basicAuth);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _bcrypt = require('../util/bcrypt');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Strategy = require('../Strategy');

var _Strategy2 = _interopRequireDefault(_Strategy);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		rounds: {
			type: 'number',
			title: 'BCrypt Rounds',
			description: 'BCrypt encryption rounds for new secrets; old secrets will continue to use their original number of rounds.',
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
			description: 'The user\'s secret, sent as plain text; stored as a bcrypt hash.'
		}
	}
});

class SecretStrategy extends _Strategy2.default {

	authenticate(ctx) {
		var request, basic, user_id, secret, credential, _ref, _ref2, user, access_token;

		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					ctx.redirect_to = ctx.query.url;

					if (!(ctx.method === 'POST' && ctx.is('application/json'))) {
						_context.next = 7;
						break;
					}

					_context.next = 4;
					return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

				case 4:
					request = _context.sent;
					_context.next = 15;
					break;

				case 7:
					if (!(ctx.method === 'POST' && ctx.is('application/x-www-form-urlencoded'))) {
						_context.next = 13;
						break;
					}

					_context.next = 10;
					return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

				case 10:
					request = _context.sent;
					_context.next = 15;
					break;

				case 13:
					basic = (0, _basicAuth2.default)(ctx.req);

					if (basic) request = {
						user_id: basic.name,
						secret: basic.pass
					};

				case 15:

					// send authenticate headers
					if (!request) {
						ctx.set('WWW-Authenticate', 'Basic realm="' + ctx.app.config.realm + '"');
						ctx.throw(401, 'HTTP Basic credentials are required.');
					}

					// get the user ID
					user_id = request.user_id;

					if (!user_id) ctx.throw(400, 'The `user_id` must be specified.');

					// validate the secret
					secret = request.secret;

					if (!secret) ctx.throw(400, 'The `secret` must be specified.');

					// get the user's secret credential
					_context.next = 22;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, user_id]));

				case 22:
					credential = _context.sent;
					_context.next = 25;
					return regeneratorRuntime.awrap((0, _bcrypt.compare)(secret, credential.details.secret));

				case 25:
					if (_context.sent) {
						_context.next = 28;
						break;
					}

					ctx.set('WWW-Authenticate', 'Basic realm="authx"');
					ctx.throw(401, 'Incorrect secret.');

				case 28:
					_context.next = 30;
					return regeneratorRuntime.awrap(Promise.all([

					// get the user
					_User2.default.get(this.conn, user_id),

					// update the credential's last_used timestamp
					credential.update({ last_used: Date.now() / 1000 })]));

				case 30:
					_ref = _context.sent;
					_ref2 = _slicedToArray(_ref, 1);
					user = _ref2[0];

					// generate the access token

					_context.t0 = _jsonwebtoken2.default;
					_context.next = 36;
					return regeneratorRuntime.awrap(user.scopes());

				case 36:
					_context.t1 = _context.sent;
					_context.t2 = {
						type: 'access_token',
						scopes: _context.t1
					};
					_context.t3 = ctx.app.config.access_token.private_key;
					_context.t4 = {
						algorithm: ctx.app.config.access_token.algorithm,
						expiresIn: ctx.app.config.access_token.expiresIn,
						audience: user.id,
						subject: user.id,
						issuer: ctx.app.config.realm
					};
					access_token = _context.t0.sign.call(_context.t0, _context.t2, _context.t3, _context.t4);


					// instead of creating a session, this strategy provides first-party access tokens to the user
					ctx.status = 200;
					ctx.body = {
						access_token: access_token
					};

					// don't create a session
					return _context.abrupt('return', null);

				case 44:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		var err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					data.details = data.details || {};

					// validate data
					err = env.validate('authority', data.details, { useDefault: true });

					if (!err) {
						_context2.next = 4;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 4:
					return _context2.abrupt('return', _Strategy2.default.createAuthority.call(this, conn, data));

				case 5:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					delta.details = delta.details || {};

					// validate data
					err = env.validate('authority', delta.details, { useDefault: true });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 4:
					return _context3.abrupt('return', _Strategy2.default.updateAuthority.call(this, authority, delta));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		var err;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					data.details = data.details || {};

					// validate data
					err = env.validate('credential', data.details, { useDefault: true });

					if (!err) {
						_context4.next = 4;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 4:
					_context4.next = 6;
					return regeneratorRuntime.awrap((0, _bcrypt.hash)(data.details.secret, this.authority.details.rounds));

				case 6:
					data.details.secret = _context4.sent;
					return _context4.abrupt('return', _Strategy2.default.prototype.createCredential.call(this, data));

				case 8:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		var err;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					delta.details = delta.details || {};

					// validate data
					err = env.validate('credential', delta.details, { useDefault: true });

					if (!err) {
						_context5.next = 4;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 4:
					if (!delta.details.secret) {
						_context5.next = 8;
						break;
					}

					_context5.next = 7;
					return regeneratorRuntime.awrap((0, _bcrypt.hash)(delta.details.secret, this.authority.details.rounds));

				case 7:
					delta.details.secret = _context5.sent;

				case 8:
					return _context5.abrupt('return', _Strategy2.default.prototype.updateCredential.call(this, credential, delta));

				case 9:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

}
exports.default = SecretStrategy;