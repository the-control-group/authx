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

var _Grant = require('../models/Grant');

var _Grant2 = _interopRequireDefault(_Grant);

var _namespace = require('../namespace');

var _namespace2 = _interopRequireDefault(_namespace);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;
				_context.next = 7;
				return regeneratorRuntime.awrap(_Grant2.default.create(ctx[_namespace2.default].conn, data));

			case 7:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 9:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var grants;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant.*.*:read', false));

			case 2:
				_context2.t0 = regeneratorRuntime;
				_context2.t1 = _Grant2.default;
				_context2.t2 = ctx[_namespace2.default].conn;
				_context2.next = 7;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant.*.user:read', false));

			case 7:
				if (!_context2.sent) {
					_context2.next = 11;
					break;
				}

				_context2.t3 = undefined;
				_context2.next = 12;
				break;

			case 11:
				_context2.t3 = function (x) {
					return x.getAll(ctx.user.id, { index: 'user_id' });
				};

			case 12:
				_context2.t4 = _context2.t3;
				_context2.t5 = _context2.t1.query.call(_context2.t1, _context2.t2, _context2.t4);
				_context2.next = 16;
				return _context2.t0.awrap.call(_context2.t0, _context2.t5);

			case 16:
				grants = _context2.sent;
				_context2.next = 19;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(grants, function (g) {
					return (0, _protect.can)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant.' + g.client_id + '.' + (ctx.user && ctx.user.id === g.user_id ? 'me' : 'user') + ':read');
				}));

			case 19:
				ctx.body = _context2.sent;

			case 20:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	var grant;
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx[_namespace2.default].conn, ctx.params.grant_id));

			case 2:
				grant = _context3.sent;
				_context3.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant.' + grant.client_id + '.' + (ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':read'));

			case 5:
				ctx.body = grant;

			case 6:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data, grant;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 2:
				data = _context4.sent;
				_context4.next = 5;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx[_namespace2.default].conn, ctx.params.grant_id));

			case 5:
				grant = _context4.sent;
				_context4.next = 8;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant.' + grant.client_id + '.' + (ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':update'));

			case 8:
				_context4.next = 10;
				return regeneratorRuntime.awrap(grant.update(data));

			case 10:
				ctx.body = _context4.sent;

			case 11:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	var grant;
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx[_namespace2.default].conn, ctx.params.grant_id));

			case 2:
				grant = _context5.sent;
				_context5.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, ctx[_namespace2.default].authx.config.realm + ':grant.' + grant.client_id + '.' + (ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':delete'));

			case 5:
				_context5.next = 7;
				return regeneratorRuntime.awrap(_Grant2.default.delete(ctx[_namespace2.default].conn, ctx.params.grant_id));

			case 7:
				ctx.body = _context5.sent;

			case 8:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}