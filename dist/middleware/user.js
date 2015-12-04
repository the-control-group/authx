'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _errors = require('../errors');

var _errors2 = _interopRequireDefault(_errors);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function _callee(ctx, next) {
	var token, cookie;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:

				// parse the session cookie for a token
				cookie = ctx.cookies.get('session');

				if (cookie) ctx.app.config.session_token.public.some(function (pub) {
					try {
						return token = ctx.session = _jsonwebtoken2.default.verify(cookie, pub.key, {
							algorithms: [pub.algorithm],
							issuer: ctx.app.config.realm
						});
					} catch (err) {
						return;
					}
				});

				// use the bearer token if present
				if (!token) token = ctx.bearer || null;

				// get the user

				if (!(token && token.sub)) {
					_context.next = 7;
					break;
				}

				_context.next = 6;
				return regeneratorRuntime.awrap(_User2.default.get(ctx.conn, token.sub));

			case 6:
				ctx.user = _context.sent;

			case 7:
				if (!(ctx.user && ctx.user.status !== 'active')) {
					_context.next = 9;
					break;
				}

				throw new _errors2.default.ForbiddenError('Your user account has been disabled.');

			case 9:
				return _context.abrupt('return', next());

			case 10:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};