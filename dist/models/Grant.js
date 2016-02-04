'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _User = require('./User');

var _User2 = _interopRequireDefault(_User);

var _Client = require('./Client');

var _Client2 = _interopRequireDefault(_Client);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const USER = Symbol('user');
const CLIENT = Symbol('client');

class Grant extends _Model2.default {

	static get table() {
		return 'grants';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('grant', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

				case 5:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 6:
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

					// validate data
					err = (0, _validator2.default)('grant', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// default `refresh_token` to existing one, or generate new one
					if (typeof data.refresh_token === 'undefined') data.refresh_token = _rethinkdb2.default.row('refresh_token').default(_uuid2.default.v4());

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 10:
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
					err = (0, _validator2.default)('grant', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	static getWithNonce(conn, id, nonce) {
		var result;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).update(function (row) {
						return _rethinkdb2.default.branch(row('nonce').eq(nonce), row.merge({ nonce: null }), row);
					}, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context4.sent;

					if (!(result.errors > 0)) {
						_context4.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (result.replaced) {
						_context4.next = 7;
						break;
					}

					throw new errors.NotFoundError('The requested grant does not exist, or the authorization code has already been used.');

				case 7:
					return _context4.abrupt('return', new this(conn, result.changes[0].new_val));

				case 8:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	user(refresh) {
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:

					// query the database for users
					if (!this[USER] || refresh) this[USER] = _User2.default.get(this[_Model2.default.Symbols.CONN], this.user_id);

					return _context5.abrupt('return', this[USER]);

				case 2:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	client(refresh) {
		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:

					// query the database for users
					if (!this[CLIENT] || refresh) this[CLIENT] = _Client2.default.get(this[_Model2.default.Symbols.CONN], this.client_id);

					return _context6.abrupt('return', this[CLIENT]);

				case 2:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	get user_id() {
		return this.id[0];
	}

	get client_id() {
		return this.id[1];
	}

}
exports.default = Grant;