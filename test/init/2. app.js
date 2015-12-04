'use strict';

var Bluebird = require('bluebird');
var Test = require('supertest/lib/test');
Test.prototype.end = Bluebird.promisify(Test.prototype.end);

var supertest = require('supertest');

module.exports = {
	setup: function(done){
		global.app = new (require('../../lib/index.js'))(global.setup.config);
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
