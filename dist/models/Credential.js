'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _User = require('./User');

var _User2 = _interopRequireDefault(_User);

var _Authority = require('./Authority');

var _Authority2 = _interopRequireDefault(_Authority);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const USER = Symbol('user');
const AUTHORITY = Symbol('authority');

class Credential extends _Model2.default {

	static get table() {
		return 'credentials';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize the authority_user_id and profile ID
					if (data.id && data.id[1] && data.profile && typeof data.profile.id === 'undefined') data.profile.id = data.id[1];

					// validate data
					err = (0, _validator2.default)('credential', data, { useDefault: true });

					if (!err) {
						_context.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

				case 7:
					if (!(data.profile && data.profile.id !== data.id[1])) {
						_context.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `authority_user_id`.');

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

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize the authority_user_id and profile ID
					if (data.id && data.id[1] && data.profile && typeof data.profile.id === 'undefined') data.profile.id = data.id[1];

					// validate data
					err = (0, _validator2.default)('credential', data, { useDefault: true });

					if (!err) {
						_context2.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

				case 7:
					if (!(data.profile && data.profile.id !== data.id[1])) {
						_context2.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `authority_user_id`.');

				case 9:
					if (!(!Array.isArray(data.id) || data.id.some(function (v, i) {
						return v !== id[i];
					}))) {
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
					err = (0, _validator2.default)('credential', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	user(refresh) {
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:

					// get the user from the database
					if (!this[USER] || refresh) this[USER] = _User2.default.get(this[_Model2.default.Symbols.CONN], this.user_id);

					return _context4.abrupt('return', this[USER]);

				case 2:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	authority(refresh) {
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:

					// get the user from the database
					if (!this[AUTHORITY] || refresh) this[AUTHORITY] = _Authority2.default.get(this[_Model2.default.Symbols.CONN], this.authority_id);

					return _context5.abrupt('return', this[AUTHORITY]);

				case 2:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	get authority_id() {
		return this.id[0];
	}

}
exports.default = Credential;