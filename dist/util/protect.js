'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.can = can;
exports.protect = protect;

var _scopes = require('./scopes');

var scopes = _interopRequireWildcard(_scopes);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function can(ctx, scope, strict) {
	return regeneratorRuntime.async(function can$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				if (!ctx.bearer) {
					_context.next = 5;
					break;
				}

				if (!(ctx.bearer.type === 'access_token' && ctx.bearer.scopes && ctx.bearer.scopes.some(function (s) {
					return scopes.can(s, scope, strict);
				}))) {
					_context.next = 3;
					break;
				}

				return _context.abrupt('return', true);

			case 3:
				_context.next = 12;
				break;

			case 5:
				_context.t0 = ctx.user;

				if (!_context.t0) {
					_context.next = 10;
					break;
				}

				_context.next = 9;
				return regeneratorRuntime.awrap(ctx.user.can(scope, strict));

			case 9:
				_context.t0 = _context.sent;

			case 10:
				if (!_context.t0) {
					_context.next = 12;
					break;
				}

				return _context.abrupt('return', true);

			case 12:
				return _context.abrupt('return', false);

			case 13:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function protect(ctx, scope, strict) {
	return regeneratorRuntime.async(function protect$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap(can(ctx, scope, strict));

			case 2:
				if (!_context2.sent) {
					_context2.next = 4;
					break;
				}

				return _context2.abrupt('return');

			case 4:
				throw new errors.ForbiddenError('You lack permission for the required scope "' + scope + '".');

			case 5:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}