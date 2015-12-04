'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('./errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const CONN = Symbol('conn');

class Model {

	// Static Methods
	// --------------

	static get table() {
		throw new Error('A Model must define a static getter `table`.');
	}

	static parseRethinkError(message) {

		// duplicate key
		if (message && message.indexOf('Duplicate primary key') === 0) return new errors.ConflictError('A record with the same id already exists.');

		// other error
		return new Error(message);
	}

	// get a record by its primary ID
	static query(conn, transform) {
		var _this = this;

		var result;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					if (!transform) transform = function (q) {
						return q;
					};

					_context.next = 3;
					return regeneratorRuntime.awrap(transform(_rethinkdb2.default.table(this.table)).run(conn));

				case 3:
					result = _context.sent;
					_context.next = 6;
					return regeneratorRuntime.awrap(result.toArray());

				case 6:
					result = _context.sent;
					return _context.abrupt('return', result.map(function (record) {
						return new _this(conn, record);
					}));

				case 8:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	// get a record by its primary ID
	static get(conn, id) {
		var result;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					_context2.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).run(conn));

				case 2:
					result = _context2.sent;

					if (result) {
						_context2.next = 5;
						break;
					}

					throw new errors.NotFoundError();

				case 5:
					return _context2.abrupt('return', new this(conn, result));

				case 6:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	// update a record by its primary ID
	static update(conn, id, data) {
		var result;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					_context3.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).update(data, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context3.sent;

					if (!(result.errors > 0)) {
						_context3.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (!(!result.replaced && !result.unchanged)) {
						_context3.next = 7;
						break;
					}

					throw new errors.NotFoundError();

				case 7:
					return _context3.abrupt('return', new this(conn, result.changes[0].new_val));

				case 8:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// save a record by its primary ID
	static save(conn, id, data) {
		var result;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).replace(data, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context4.sent;

					if (!(result.errors > 0)) {
						_context4.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					return _context4.abrupt('return', new this(conn, result.changes[0].new_val));

				case 6:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	// delete a record by its primary ID
	static delete(conn, id) {
		var result;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					_context5.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).delete({ returnChanges: 'always' }).run(conn));

				case 2:
					result = _context5.sent;

					if (!(result.errors > 0)) {
						_context5.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (result.deleted) {
						_context5.next = 7;
						break;
					}

					throw new errors.NotFoundError();

				case 7:
					return _context5.abrupt('return', new this(conn, result.changes[0].old_val));

				case 8:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	// create a new record
	static create(conn, data) {
		var result;
		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:
					_context6.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).insert(data, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context6.sent;

					if (!(result.errors > 0)) {
						_context6.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (result.inserted) {
						_context6.next = 7;
						break;
					}

					throw new errors.NotFoundError();

				case 7:
					return _context6.abrupt('return', new this(conn, result.changes[0].new_val));

				case 8:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	// Constructor
	// -----------

	constructor(conn, data) {

		// assign data
		_lodash2.default.assign(this, data);

		// assign the connection
		this[Model.Symbols.CONN] = conn;
	}

	// Methods
	// -------

	// update this model instance
	update(data) {
		return regeneratorRuntime.async(function _callee7$(_context7) {
			while (1) switch (_context7.prev = _context7.next) {
				case 0:
					_context7.next = 2;
					return regeneratorRuntime.awrap(this.constructor.update(this[Model.Symbols.CONN], this.id, data));

				case 2:
					return _context7.abrupt('return', _context7.sent);

				case 3:
				case 'end':
					return _context7.stop();
			}
		}, null, this);
	}

	// delete this model instance{}
	delete() {
		return regeneratorRuntime.async(function _callee8$(_context8) {
			while (1) switch (_context8.prev = _context8.next) {
				case 0:
					_context8.next = 2;
					return regeneratorRuntime.awrap(this.constructor.delete(this[Model.Symbols.CONN], this.id));

				case 2:
					return _context8.abrupt('return', _context8.sent);

				case 3:
				case 'end':
					return _context8.stop();
			}
		}, null, this);
	}

}

exports.default = Model;
Model.Symbols = {
	CONN: CONN
};