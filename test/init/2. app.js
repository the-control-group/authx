'use strict';

import Promise from 'bluebird';
import Test from 'supertest/lib/test';
Test.prototype.end = Promise.promisify(Test.prototype.end);

import supertest from 'supertest';
import AuthX from '../../src/index.js';

module.exports = {
	setup: function(done){
		global.app = new AuthX(global.setup.config);
		global.server = app.listen();
		Object.defineProperty(global, 'agent', {
			get: () => supertest.agent(global.server)
		});
		done();
	},
	teardown: function(done){
		done();
	}
};
