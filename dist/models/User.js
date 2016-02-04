'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _Role = require('./Role');

var _Role2 = _interopRequireDefault(_Role);

var _Grant = require('./Grant');

var _Grant2 = _interopRequireDefault(_Grant);

var _Credential = require('./Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _Team = require('./Team');

var _Team2 = _interopRequireDefault(_Team);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ROLES = Symbol('roles');
const GRANTS = Symbol('grants');
const CREDENTIALS = Symbol('credentials');
const SCOPES = Symbol('scopes');
const TEAM = Symbol('team');

class User extends _Model2.default {

	static get table() {
		return 'users';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: _uuid2.default.v4(), profile: {} }, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize ID
					if (!data.profile || typeof data.profile.id === 'undefined') data.profile.id = data.id;

					// validate data
					err = (0, _validator2.default)('user', data, { useDefault: true });

					if (!err) {
						_context.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid user must be supplied.', err.validation);

				case 7:
					if (!(data.profile.id !== data.id)) {
						_context.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `id`.');

				case 9:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 10:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id, profile: {} }, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize ID
					if (!data.profile || typeof data.profile.id === 'undefined') data.profile.id = data.id;

					// validate data
					err = (0, _validator2.default)('user', data, { useDefault: true });

					if (!err) {
						_context2.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid user must be supplied.', err.validation);

				case 7:
					if (!(data.profile.id !== data.id)) {
						_context2.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `id`.');

				case 9:
					if (!(data.id !== id)) {
						_context2.next = 11;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 11:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 13:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('user', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid user must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	static delete(conn, id) {
		var credentials, user;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(_Credential2.default.query(conn, function (q) {
						return q.getAll(id, { index: 'user_id' }).delete({ returnChanges: 'always' }).do(function (results) {
							return _rethinkdb2.default.branch(results('deleted').gt(0), results('changes').map(function (d) {
								return d('old_val');
							}), []);
						});
					}));

				case 2:
					credentials = _context4.sent;
					_context4.next = 5;
					return regeneratorRuntime.awrap(_Model2.default.delete.call(this, conn, id));

				case 5:
					user = _context4.sent;

					// attach the deleted credentials
					user[CREDENTIALS] = Promise.resolve(credentials);

					return _context4.abrupt('return', user);

				case 8:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	credentials(refresh) {
		var _this = this;

		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:

					// query the database for credentials
					if (!this[CREDENTIALS] || refresh) this[CREDENTIALS] = _Credential2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this.id, { index: 'user_id' });
					});

					return _context5.abrupt('return', this[CREDENTIALS]);

				case 2:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	roles(refresh) {
		var _this2 = this;

		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:

					// query the database for roles
					if (!this[ROLES] || refresh) this[ROLES] = _Role2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this2.id, { index: 'assignments' });
					});

					return _context6.abrupt('return', this[ROLES]);

				case 2:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	grants(refresh) {
		var _this3 = this;

		return regeneratorRuntime.async(function _callee7$(_context7) {
			while (1) switch (_context7.prev = _context7.next) {
				case 0:

					// query the database for roles
					if (!this[GRANTS] || refresh) this[GRANTS] = _Grant2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this3.id, { index: 'user_id' });
					});

					return _context7.abrupt('return', this[GRANTS]);

				case 2:
				case 'end':
					return _context7.stop();
			}
		}, null, this);
	}

	team(refresh) {
		return regeneratorRuntime.async(function _callee8$(_context8) {
			while (1) switch (_context8.prev = _context8.next) {
				case 0:

					// query the database for team
					if (!this[TEAM] || refresh) this[TEAM] = this.team_id ? _Team2.default.get(this[_Model2.default.Symbols.CONN], this.team_id) : null;

					return _context8.abrupt('return', this[TEAM]);

				case 2:
				case 'end':
					return _context8.stop();
			}
		}, null, this);
	}

	scopes(refresh) {
		var roles, scopes;
		return regeneratorRuntime.async(function _callee9$(_context9) {
			while (1) switch (_context9.prev = _context9.next) {
				case 0:
					if (!(!this[SCOPES] || refresh)) {
						_context9.next = 6;
						break;
					}

					_context9.next = 3;
					return regeneratorRuntime.awrap(this.roles());

				case 3:
					roles = _context9.sent;
					scopes = roles.map(function (role) {
						return role.scopes;
					});

					this[SCOPES] = scopes.reduce(function (a, b) {
						return a.concat(b);
					}, []);

				case 6:
					return _context9.abrupt('return', this[SCOPES]);

				case 7:
				case 'end':
					return _context9.stop();
			}
		}, null, this);
	}

	can(scope, strict) {
		var roles;
		return regeneratorRuntime.async(function _callee10$(_context10) {
			while (1) switch (_context10.prev = _context10.next) {
				case 0:
					_context10.next = 2;
					return regeneratorRuntime.awrap(this.roles());

				case 2:
					roles = _context10.sent;
					return _context10.abrupt('return', roles.some(function (role) {
						return role.can(scope, strict);
					}));

				case 4:
				case 'end':
					return _context10.stop();
			}
		}, null, this);
	}

}
exports.default = User;