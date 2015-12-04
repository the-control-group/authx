'use strict';

import r from 'rethinkdb';
import {assert} from 'chai';
import * as errors from '../../../src/errors';
import User from '../../../src/models/User';
import Credential from '../../../src/models/Credential';
import Role from '../../../src/models/Role';

require('../../init.js');

var conn;
before(async () => {
	conn = await r.connect(global.setup.config.db);
});

var ids = [];
describe('User', () => {


	// Static Methods
	// --------------

	describe('(static methods)', () => {

		describe('query', () => {
			it('should return all objects', async () => {
				var users = await User.query(conn);
				assert.isArray(users);
				assert.lengthOf(users, 9);
			});
			it('accepts a query tranformation argument', async () => {
				var users = await User.query(conn, (q) => q.filter({profile: {displayName: 'Toby Flenderson'}}));
				assert.isArray(users);
				assert.lengthOf(users, 1);
			});
		});


		describe('create', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await User.create(conn, {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should create a new object', async () => {
				try {
					var user = await User.create(conn, {profile: {displayName: 'Created User'}, type: 'human'});
				} catch (e) {
					console.log(e);
					throw e;
				}
				assert.isString(user.id);
				assert.equal(user.profile.id, user.id);
				assert.equal(user.profile.displayName, 'Created User');
				assert(user.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(user.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(user.id);
			});
		});


		describe('get', () => {
			it('should fail to find a nonexistant object', async () => {
				try {
					await User.get(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should fetch the correct object', async () => {
				var user = await User.get(conn, 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9');
				assert.equal(user.id, 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9');
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should fail to find a nonexistant object', async () => {
				try {
					await User.update(conn, 'i-dont-exist', {});
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should update the correct object', async () => {
				var user = await User.update(conn, ids[0], {profile: {displayName: 'Updated User'}});
				assert.equal(user.id, ids[0]);
				assert.equal(user.profile.displayName, 'Updated User');
				assert(user.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should fail to find a nonexistant object', async () => {
				try {
					await User.delete(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should delete the correct object', async () => {
				var user = await User.delete(conn, id);
				assert.equal(user.id, id);
			});
			it('should fail to find a deleted object', async () => {
				try {
					await User.get(conn, id);
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
		});

	});


	// Instance Methods
	// ----------------

	describe('(instance methods)', () => {

		before(async () => {
			var user = await User.create(conn, {profile: {displayName: 'Created User'}, type: 'human'});
			assert.isString(user.id);
			ids.push(user.id);
		});


		describe('credentials', () => {
			it('should return all assigned credentials', async () => {
				var user = await User.get(conn, 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9');
				var credentials = await user.credentials();
				assert.isArray(credentials);
				assert.lengthOf(credentials, 2);
				credentials.forEach(credential => assert.instanceOf(credential, Credential));
			});
		});


		describe('roles', () => {
			it('should return all assigned roles', async () => {
				var user = await User.get(conn, 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9');
				var roles = await user.roles();
				assert.isArray(roles);
				assert.lengthOf(roles, 2);
				roles.forEach(role => assert.instanceOf(role, Role));
			});
			it('should ignore unassigned roles', async () => {
				var user = await User.get(conn, 'dc396449-2c7d-4a23-a159-e6415ded71d2');
				var roles = await user.roles();
				assert.isArray(roles);
				assert.lengthOf(roles, 1);
				roles.forEach(role => assert.instanceOf(role, Role));
			});
		});


		describe('scopes', () => {
			it('should return all assigned scopes', async () => {
				var user = await User.get(conn, 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9');
				var scopes = await user.scopes();
				assert.isArray(scopes);
				assert.lengthOf(scopes, 5);
				scopes.forEach(permission => assert.isString(permission));
			});
		});


		describe('can', () => {
			it('should calculate user scopes', async () => {
				var user = await User.get(conn, '306eabbb-cc2b-4f88-be19-4bb6ec98e5c3');
				assert.isTrue(await user.can('AuthX:user:create'));
				assert.isTrue(await user.can('AuthX:credential.foo.user:create'));
				assert.isTrue(await user.can('AuthX:user:create.other'));
				assert.isFalse(await user.can('AuthX:authority.foo:delete'));
				assert.isFalse(await user.can('AuthX:grant.foo:update'));
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should update the correct object', async () => {
				var user = await User.get(conn, ids[0]);
				assert.equal(user.id, ids[0]);
				assert.notEqual(user.profile.displayName, 'Updated User');
				user = await user.update({profile: {displayName: 'Updated User'}});
				assert.equal(user.id, ids[0]);
				assert.equal(user.profile.displayName, 'Updated User');
				assert(user.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should update the correct object', async () => {
				var user = await User.get(conn, id);
				assert.equal(user.id, id);
				user = await user.delete();
				assert.equal(user.id, id);
			});
		});

	});







	after(async () => {
		await Promise.all(ids.map(id => User.delete(conn, id)));
		await conn.close();
	});

});
