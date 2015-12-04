'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let parser = /^Bearer\s+([^\s]+)\s*$/;

exports.default = function _callee(ctx, next) {
	var parsed;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				ctx.bearer = null;

				// parse the authorization header
				parsed = ctx.headers.authorization ? ctx.headers.authorization.match(parser) : null;

				// verify the JWT against all public keys

				if (!(parsed && parsed[1] && !ctx.app.config.access_token.public.some(function (pub) {
					try {
						return ctx.bearer = _jsonwebtoken2.default.verify(parsed[1], pub.key, {
							algorithms: [pub.algorithm],
							issuer: ctx.app.config.realm
						});
					} catch (err) {
						return;
					}
				}))) {
					_context.next = 4;
					break;
				}

				throw errors.AuthenticationError('The supplied bearer token is invalid.');

			case 4:
				return _context.abrupt('return', next());

			case 5:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};