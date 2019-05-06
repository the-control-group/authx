'use strict';

const gp = require('generic-pool');
const r = require('rethinkdb');

module.exports = class Pool {
	constructor(options, max, min, idleTimeoutMillis) {
		this.pool = new gp.Pool({
			name: 'rethinkdb',
			create: callback => {
				return r.connect(options, callback);
			},
			destroy: connection => {
				return connection.close();
			},
			validate: function(connection) {
				return connection.isOpen();
			},
			log: false,
			min: min || 2,
			max: max || 10,
			idleTimeoutMillis: idleTimeoutMillis || 30000
		});
	}

	acquire() {
		return new Promise((resolve, reject) => {
			return this.pool.acquire((err, conn) => {
				if (err) return reject(err);
				conn.release = () => {
					return this.pool.release(conn);
				};
				resolve(conn);
			});
		});
	}
};
