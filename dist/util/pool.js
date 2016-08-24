'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _genericPool = require('generic-pool');

var _genericPool2 = _interopRequireDefault(_genericPool);

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Pool {

	constructor(options, max, min, idleTimeoutMillis) {
		this.pool = _genericPool2.default.Pool({
			name: 'rethinkdb',
			create: function (callback) {
				return _rethinkdb2.default.connect(options, callback);
			},
			destroy: function (connection) {
				return connection.close();
			},
			validate: function (connection) {
				return connection.isOpen();
			},
			log: false,
			min: min || 2,
			max: max || 10,
			idleTimeoutMillis: idleTimeoutMillis || 30000
		});
	}

	acquire() {
		var _this = this;

		return new Promise(function (resolve, reject) {
			return _this.pool.acquire(function (err, conn) {
				if (err) return reject(err);
				conn.release = function () {
					return _this.pool.release(conn);
				};
				resolve(conn);
			});
		});
	}

}
exports.default = Pool;