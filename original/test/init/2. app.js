'use strict';

const Promise = require('bluebird');
const Test = require('supertest/lib/test');
Test.prototype.end = Promise.promisify(Test.prototype.end);

const supertest = require('supertest');

const Koa = require('koa');
const AuthX = require('../../src/index.js');
const {
	EmailStrategy,
	GoogleStrategy,
	PasswordStrategy,
	SecretStrategy,
	InContactStrategy
} = AuthX;

module.exports = {
	setup: function(done) {
		global.authx = new AuthX(global.setup.config, {
			email: EmailStrategy,
			google: GoogleStrategy,
			password: PasswordStrategy,
			secret: SecretStrategy,
			incontact: InContactStrategy
		});
		global.app = new Koa().use(global.authx.routes());
		global.server = app.listen();
		console.log('-----', global.server);
		done();
	},
	teardown: function(done) {
		done();
	}
};
