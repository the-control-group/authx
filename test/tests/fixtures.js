'use strict';

import jjv from 'jjv';

var env = jjv();
import profile from '../../schema/profile';
env.addSchema(profile);

import authority from '../../schema/authority';
import authorities from '../../fixtures/authorities';
env.addSchema(authority);

import client from '../../schema/client';
import clients from '../../fixtures/clients';
env.addSchema(client);

import credential from '../../schema/credential';
import credentials from '../../fixtures/credentials';
env.addSchema(credential);

import grant from '../../schema/grant';
import grants from '../../fixtures/grants';
env.addSchema(grant);

import role from '../../schema/role';
import roles from '../../fixtures/roles';
env.addSchema(role);

import user from '../../schema/user';
import users from '../../fixtures/users';
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
