'use strict';

const jjv = require('jjv');

var env = jjv();
const profile = require('../../schema/profile');
env.addSchema(profile);

const authority = require('../../schema/authority');
const authorities = require('../../fixtures/authorities');
env.addSchema(authority);

const client = require('../../schema/client');
const clients = require('../../fixtures/clients');
env.addSchema(client);

const credential = require('../../schema/credential');
const credentials = require('../../fixtures/credentials');
env.addSchema(credential);

const grant = require('../../schema/grant');
const grants = require('../../fixtures/grants');
env.addSchema(grant);

const role = require('../../schema/role');
const roles = require('../../fixtures/roles');
env.addSchema(role);

const user = require('../../schema/user');
const users = require('../../fixtures/users');
env.addSchema(user);


describe('Fixtures', () => {

	it('(authorities) should env.validate', () => {
		authorities.data.forEach(f => {
			var err = env.validate('authority', f);
			if (!err) return;
			throw new Error(f.id + ' ' + JSON.stringify(err.validation, null, '\t'));
		});
	});

	it('(clients) should env.validate', () => {
		clients.data.forEach(f => {
			var err = env.validate('client', f);
			if (!err) return;
			throw new Error(f.id + ' ' + JSON.stringify(err.validation, null, '\t'));
		});
	});

	it('(credentials) should env.validate', () => {
		credentials.data.forEach(f => {
			var err = env.validate('credential', f);
			if (!err) return;
			throw new Error(f.id + ' ' + JSON.stringify(err.validation, null, '\t'));
		});
	});

	it('(grants) should env.validate', () => {
		grants.data.forEach(f => {
			var err = env.validate('grant', f);
			if (!err) return;
			throw new Error(f.id + ' ' + JSON.stringify(err.validation, null, '\t'));
		});
	});

	it('(roles) should env.validate', () => {
		roles.data.forEach(f => {
			var err = env.validate('role', f);
			if (!err) return;
			throw new Error(f.id + ' ' + JSON.stringify(err.validation, null, '\t'));
		});
	});

	it('(users) should env.validate', () => {
		users.data.forEach(f => {
			var err = env.validate('user', f);
			if (!err) return;
			throw new Error(f.id + ' ' + JSON.stringify(err.validation, null, '\t'));
		});
	});
});
