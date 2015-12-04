'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

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

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data, _ref, _ref2, authority, Strategy, strategy;

	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 2:
				data = _context.sent;

				if (data.user_id) {
					_context.next = 5;
					break;
				}

				throw new errors.ValidationError('A valid credential must be supplied.', { user_id: { required: true } });

			case 5:
				if (!(!Array.isArray(data.id) || data.id.length !== 2)) {
					_context.next = 7;
					break;
				}

				throw new errors.ValidationError('A valid credential must be supplied.', { id: { type: 'array', schema: { '0': { type: 'string' }, '1': { type: 'string' } }, additionalItems: false } });

			case 7:
				_context.next = 9;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + data.id[0] + '.' + (ctx.user && ctx.user.id === data.user_id ? 'me' : 'user') + ':read'));

			case 9:
				_context.next = 11;
				return regeneratorRuntime.awrap(_bluebird2.default.all([

				// fetch the authority
				_Authority2.default.get(ctx.conn, data.id[0]).catch(function (err) {
					if (err instanceof errors.NotFoundError) throw new errors.ValidationError('The authority identified by `id[0]` does not exist.');

					throw err;
				}),

				// fetch the user
				_User2.default.get(ctx.conn, data.user_id).catch(function (err) {
					if (err instanceof errors.NotFoundError) throw new errors.ValidationError('The user identified by `user_id` does not exist.');

					throw err;
				})]));

			case 11:
				_ref = _context.sent;
				_ref2 = _slicedToArray(_ref, 1);
				authority = _ref2[0];

				// get the strategy

				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context.next = 17;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 17:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// create the credential

				_context.next = 20;
				return regeneratorRuntime.awrap(strategy.createCredential(data));

			case 20:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 22:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var credentials;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.*.*:read', false));

			case 2:
				_context2.t0 = regeneratorRuntime;
				_context2.t1 = _Credential2.default;
				_context2.t2 = ctx.conn;
				_context2.next = 7;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:credential.*.user:read', false));

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
				credentials = _context2.sent;
				_context2.next = 19;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(credentials, function (c) {
					return (0, _protect.can)(ctx, 'AuthX:credential.' + c.authority_id + '.' + (ctx.user && ctx.user.id === c.user_id ? 'me' : 'user') + ':read');
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
	var credential;
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap(_Credential2.default.get(ctx.conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]));

			case 2:
				credential = _context3.sent;
				_context3.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + credential.authority_id + '.' + (ctx.user && ctx.user.id === credential.user_id ? 'me' : 'user') + ':read'));

			case 5:
				ctx.body = credential;

			case 6:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data, credential, authority, Strategy, strategy;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 2:
				data = _context4.sent;
				_context4.next = 5;
				return regeneratorRuntime.awrap(_Credential2.default.get(ctx.conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]));

			case 5:
				credential = _context4.sent;
				_context4.next = 8;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + credential.authority_id + '.' + (ctx.user && ctx.user.id === credential.user_id ? 'me' : 'user') + ':update'));

			case 8:
				_context4.next = 10;
				return regeneratorRuntime.awrap(credential.authority());

			case 10:
				authority = _context4.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context4.next = 14;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 14:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// update the credential

				_context4.next = 17;
				return regeneratorRuntime.awrap(strategy.updateCredential(credential, data));

			case 17:
				ctx.body = _context4.sent;

			case 18:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	var credential, authority, Strategy, strategy;
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap(_Credential2.default.get(ctx.conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]));

			case 2:
				credential = _context5.sent;
				_context5.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + credential.authority_id + '.' + (ctx.user && ctx.user.id === credential.user_id ? 'me' : 'user') + ':delete'));

			case 5:
				_context5.next = 7;
				return regeneratorRuntime.awrap(credential.authority());

			case 7:
				authority = _context5.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context5.next = 11;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 11:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// delete the credential

				_context5.next = 14;
				return regeneratorRuntime.awrap(strategy.deleteCredential(credential));

			case 14:
				ctx.body = _context5.sent;

			case 15:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}