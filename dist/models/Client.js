'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Client extends _Model2.default {

	static get table() {
		return 'clients';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('client', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid client must be supplied.', err.validation);

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
					err = (0, _validator2.default)('client', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid client must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 9:
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
					err = (0, _validator2.default)('client', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid client must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

}
exports.default = Client;