'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Authority = require('../models/Authority');

var _Authority2 = _interopRequireDefault(_Authority);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data, Strategy;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;

				if (data.strategy) {
					_context.next = 7;
					break;
				}

				throw new errors.ValidationError('A valid authority must be supplied.', { strategy: { required: true } });

			case 7:

				// get the strategy
				Strategy = ctx.app.strategies[data.strategy];

				if (Strategy) {
					_context.next = 10;
					break;
				}

				throw new errors.ValidationError('Strategy "' + data.strategy + '" not implemented.', { strategy: { enum: Object.keys(ctx.app.strategies) } });

			case 10:
				_context.next = 12;
				return regeneratorRuntime.awrap(Strategy.createAuthority(ctx.conn, data));

			case 12:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 14:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var authorities;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.*:read', false));

			case 2:
				_context2.next = 4;
				return regeneratorRuntime.awrap(_Authority2.default.query(ctx.conn));

			case 4:
				authorities = _context2.sent;
				_context2.next = 7;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(authorities, function (a) {
					return (0, _protect.can)(ctx, 'AuthX:authority.' + a.id + ':read');
				}));

			case 7:
				ctx.body = _context2.sent;

			case 8:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.' + ctx.params.authority_id + ':read'));

			case 2:
				_context3.next = 4;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 4:
				ctx.body = _context3.sent;

			case 5:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data, authority, Strategy;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.' + ctx.params.authority_id + ':update'));

			case 2:
				_context4.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context4.sent;
				_context4.next = 7;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 7:
				authority = _context4.sent;

				if (!(data.strategy && data.strategy !== authority.strategy)) {
					_context4.next = 10;
					break;
				}

				throw new errors.ValidationError('An authority\'s strategy cannot be changed.');

			case 10:

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context4.next = 13;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 13:
				_context4.next = 15;
				return regeneratorRuntime.awrap(Strategy.updateAuthority(authority, data));

			case 15:
				ctx.body = _context4.sent;

			case 16:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	var authority, Strategy;
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.' + ctx.params.authority_id + ':delete'));

			case 2:
				_context5.next = 4;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 4:
				authority = _context5.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context5.next = 8;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 8:
				_context5.next = 10;
				return regeneratorRuntime.awrap(Strategy.deleteAuthority(authority));

			case 10:
				ctx.body = _context5.sent;

			case 11:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}