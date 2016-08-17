'use strict';

import Promise from 'bluebird';
import Test from 'supertest/lib/test';
Test.prototype.end = Promise.promisify(Test.prototype.end);

import supertest from 'supertest';

import Koa from 'koa';
import AuthX, { EmailStrategy, GoogleStrategy, PasswordStrategy, SecretStrategy, InContactStrategy } from '../../src/index.js';


module.exports = {
	setup: function(done){
		global.authx = new AuthX(global.setup.config, {
			email: EmailStrategy,
			google: GoogleStrategy,
			password: PasswordStrategy,
			secret: SecretStrategy,
			incontact: InContactStrategy
		});
		global.app = (new Koa()).use(global.authx.routes());
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
