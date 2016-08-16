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

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _queryParams = require('../util/queryParams');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Role = require('../models/Role');

var _Role2 = _interopRequireDefault(_Role);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let includable = ['credentials', 'grants', 'roles', 'scopes', 'team'];

function post(ctx) {
	var includes, data, user;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:user:create'));

			case 2:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context.next = 5;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 5:
				data = _context.sent;
				_context.next = 8;
				return regeneratorRuntime.awrap(_User2.default.create(ctx.conn, data));

			case 8:
				user = _context.sent;
				_context.next = 11;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 11:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 13:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var _this = this;

	var ids, role_ids, roles, assignments, transformer, includes, users;
	return regeneratorRuntime.async(function query$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:me:read'));

			case 2:
				_context3.t0 = !_context3.sent;

				if (!_context3.t0) {
					_context3.next = 7;
					break;
				}

				_context3.next = 6;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:user:read'));

			case 6:
				_context3.t0 = !_context3.sent;

			case 7:
				if (!_context3.t0) {
					_context3.next = 9;
					break;
				}

				throw new errors.ForbiddenError('You lack permission for the required scope "AuthX:user:read".');

			case 9:
				_context3.next = 11;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:user:read'));

			case 11:
				if (_context3.sent) {
					_context3.next = 15;
					break;
				}

				ids = [ctx.user.id];

				// restrict to provided roles
				_context3.next = 25;
				break;

			case 15:
				if (!ctx.query.role_ids) {
					_context3.next = 25;
					break;
				}

				role_ids = (0, _queryParams.parseRoles)(ctx);

				// make sure we have permission to access these roles

				_context3.next = 19;
				return regeneratorRuntime.awrap(_bluebird2.default.map(role_ids, function (id) {
					return (0, _protect.protect)(ctx, 'AuthX:role.' + id + ':read');
				}));

			case 19:
				_context3.next = 21;
				return regeneratorRuntime.awrap(_Role2.default.query(ctx.conn, function (x) {
					return x.getAll(_rethinkdb2.default.args(role_ids), { index: 'id' });
				}));

			case 21:
				roles = _context3.sent;


				// combine assignments
				assignments = {};

				roles.forEach(function (role) {
					Object.keys(role.assignments).forEach(function (a) {
						if (role.assignments[a]) assignments[a] = true;
					});
				});

				// get user IDs
				ids = Object.keys(assignments);

			case 25:
				transformer = function (x) {
					var index;

					// restrict to known ids

					if (ids) {
						x = x.getAll(_rethinkdb2.default.args(ids), { index: 'id' });
						index = 'id';
					}

					// order
					if (!index || index === 'created') {
						x = x.orderBy({ index: 'created' });
						index = 'created';
					} else x = x.orderBy('created');

					// filter by status
					if (ctx.query.status) if (!index || index === 'status') {
						x = x.getAll(ctx.query.status, { index: 'status' });
						index = 'status';
					} else x = x.filter({ status: ctx.query.status });

					// fuzzy search by name
					var search = ctx.query.search ? ctx.query.search.toLowerCase() : null;
					if (ctx.query.search) x = x.filter(function (row) {
						return _rethinkdb2.default.or(row('profile')('displayName').downcase().match(search), row('profile')('nickname').default('').downcase().match(search), row('profile')('name')('familyName').default('').downcase().match(search), row('profile')('name')('givenName').default('').downcase().match(search), row('profile')('name')('middleName').default('').downcase().match(search));
					});

					// skip
					var skip = parseInt(ctx.query.skip);
					if (skip) x = x.skip(skip);

					// limit
					var limit = parseInt(ctx.query.limit);
					if (limit) x = x.limit(limit);

					return x;
				};

				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context3.next = 29;
				return regeneratorRuntime.awrap(_User2.default.query(ctx.conn, transformer));

			case 29:
				users = _context3.sent;
				_context3.next = 32;
				return regeneratorRuntime.awrap(_bluebird2.default.all(users.map(function _callee(u) {
					return regeneratorRuntime.async(function _callee$(_context2) {
						while (1) switch (_context2.prev = _context2.next) {
							case 0:
								_context2.next = 2;
								return regeneratorRuntime.awrap(include(u, includes, ctx));

							case 2:
								return _context2.abrupt('return', _context2.sent);

							case 3:
							case 'end':
								return _context2.stop();
						}
					}, null, _this);
				})));

			case 32:
				ctx.body = _context3.sent;

			case 33:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function get(ctx) {
	var user_id, includes, user;
	return regeneratorRuntime.async(function get$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
				_context4.next = 3;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':read'));

			case 3:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context4.next = 6;
				return regeneratorRuntime.awrap(_User2.default.get(ctx.conn, user_id));

			case 6:
				user = _context4.sent;
				_context4.next = 9;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 9:
				ctx.body = _context4.sent;

			case 10:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var user_id, includes, data, user;
	return regeneratorRuntime.async(function patch$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
				_context5.next = 3;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':update'));

			case 3:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context5.next = 6;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 6:
				data = _context5.sent;
				_context5.next = 9;
				return regeneratorRuntime.awrap(_User2.default.update(ctx.conn, user_id, data));

			case 9:
				user = _context5.sent;
				_context5.next = 12;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 12:
				ctx.body = _context5.sent;

			case 13:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}

function del(ctx) {
	var user_id, includes, user;
	return regeneratorRuntime.async(function del$(_context6) {
		while (1) switch (_context6.prev = _context6.next) {
			case 0:
				user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
				_context6.next = 3;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':delete'));

			case 3:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);

				// make sure to include credentials, which are automatically deleted with the user

				includes = includes || [];
				if (includes.indexOf('credentials') === -1) includes.push('credentials');

				_context6.next = 8;
				return regeneratorRuntime.awrap(_User2.default.delete(ctx.conn, user_id));

			case 8:
				user = _context6.sent;
				_context6.next = 11;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 11:
				ctx.body = _context6.sent;

			case 12:
			case 'end':
				return _context6.stop();
		}
	}, null, this);
}

function include(user, includes, ctx) {
	var _this2 = this;

	var results, included;
	return regeneratorRuntime.async(function include$(_context8) {
		while (1) switch (_context8.prev = _context8.next) {
			case 0:
				if (!(!includes || !includes.length)) {
					_context8.next = 2;
					break;
				}

				return _context8.abrupt('return', user);

			case 2:
				_context8.next = 4;
				return regeneratorRuntime.awrap(_bluebird2.default.map(includes, function _callee2(i) {
					var result;
					return regeneratorRuntime.async(function _callee2$(_context7) {
						while (1) switch (_context7.prev = _context7.next) {
							case 0:
								_context7.next = 2;
								return regeneratorRuntime.awrap(user[i]());

							case 2:
								result = _context7.sent;

								if (!(i === 'credentials')) {
									_context7.next = 7;
									break;
								}

								_context7.next = 6;
								return regeneratorRuntime.awrap(_bluebird2.default.filter(result, function (c) {
									return (0, _protect.can)(ctx, 'AuthX:credential.' + c.authority_id + '.' + (ctx.user && ctx.user.id === user.id ? 'me' : 'user') + ':read');
								}));

							case 6:
								result = _context7.sent;

							case 7:
								if (!(i === 'grants')) {
									_context7.next = 11;
									break;
								}

								_context7.next = 10;
								return regeneratorRuntime.awrap(_bluebird2.default.filter(result, function (g) {
									return (0, _protect.can)(ctx, 'AuthX:grant.' + g.client_id + '.' + (ctx.user && ctx.user.id === user.id ? 'me' : 'user') + ':read');
								}));

							case 10:
								result = _context7.sent;

							case 11:
								if (!(i === 'roles')) {
									_context7.next = 15;
									break;
								}

								_context7.next = 14;
								return regeneratorRuntime.awrap(_bluebird2.default.filter(result, function (r) {
									return (0, _protect.can)(ctx, 'AuthX:role.' + r.id + ':read');
								}));

							case 14:
								result = _context7.sent;

							case 15:
								return _context7.abrupt('return', result);

							case 16:
							case 'end':
								return _context7.stop();
						}
					}, null, _this2);
				}));

			case 4:
				results = _context8.sent;


				// assign the results to a new object
				included = Object.assign(Object.create(_User2.default.prototype), user);

				results.forEach(function (v, i) {
					return included[includes[i]] = v;
				});

				// return the user with includes
				return _context8.abrupt('return', included);

			case 8:
			case 'end':
				return _context8.stop();
		}
	}, null, this);
}