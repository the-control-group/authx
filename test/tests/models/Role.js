'use strict';

import r from 'rethinkdb';
import {assert} from 'chai';
import * as errors from '../../../lib/errors';
import Role from '../../../lib/models/Role';
import User from '../../../lib/models/User';

require('../../init.js');

var conn;
before(async () => {
	conn = await r.connect(global.setup.config.db);
});

var ids = [];
describe('Role', () => {


	// Static Methods
	// --------------

	describe('(static methods)', () => {

		describe('query', () => {
			it('should return all objects', async () => {
				var roles = await Role.query(conn);
				assert.isArray(roles);
				assert.lengthOf(roles, 5);
			});
			it('accepts a query tranformation argument', async () => {
				var roles = await Role.query(conn, (q) => q.filter({name: 'Sales Team'}));
				assert.isArray(roles);
				assert.lengthOf(roles, 1);
			});
		});


		describe('create', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Role.create(conn, {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should create a new object', async () => {
				var role = await Role.create(conn, {name: 'Created Role'});
				assert.isString(role.id);
				assert.equal(role.name, 'Created Role');
				assert(role.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(role.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(role.id);
			});
		});


		describe('get', () => {
			it('should fail to find a nonexistant object', async () => {
				try {
					await Role.get(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should fetch the correct object', async () => {
				var role = await Role.get(conn, '2ec2118e-9c49-474f-9f44-da35c4420ef6');
				assert.equal(role.id, '2ec2118e-9c49-474f-9f44-da35c4420ef6');
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should fail to find a nonexistant object', async () => {
				try {
					await Role.update(conn, 'i-dont-exist', {});
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should update the correct object', async () => {
				var role = await Role.update(conn, ids[0], {name: 'Updated Role'});
				assert.equal(role.id, ids[0]);
				assert.equal(role.name, 'Updated Role');
				assert(role.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should fail to find a nonexistant object', async () => {
				try {
					await Role.delete(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should delete the correct object', async () => {
				var role = await Role.delete(conn, id);
				assert.equal(role.id, id);
			});
			it('should fail to find a deleted object', async () => {
				try {
					await Role.get(conn, id);
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
			var role = await Role.create(conn, {name: 'Created Role'});
			assert.isString(role.id);
			ids.push(role.id);
		});


		describe('users', () => {
			it('should return all assigned users', async () => {
				var role = await Role.get(conn, '2ec2118e-9c49-474f-9f44-da35c4420ef6');
				var users = await role.users();
				assert.isArray(users);
				assert.lengthOf(users, 3);
			});
			it('should ignore unassigned users', async () => {
				var role = await Role.get(conn, 'root');
				var users = await role.users();
				assert.isArray(users);
				assert.lengthOf(users, 1);
				users.forEach(user => assert.instanceOf(user, User));
			});
		});


		describe('can', () => {
			it('should calculate user permissions', async () => {
				var role = await Role.get(conn, '08e2b39e-ba9f-4de2-8dca-aef460793566');
				assert.isTrue(await role.can('AuthX:user:create'));
				assert.isTrue(await role.can('AuthX:credential.foo.user:create'));
				assert.isTrue(await role.can('AuthX:user:create.other'));
				assert.isFalse(await role.can('AuthX:authority.foo:delete'));
				assert.isFalse(await role.can('AuthX:grant.foo:update'));
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should update the correct object', async () => {
				var role = await Role.get(conn, ids[0]);
				assert.equal(role.id, ids[0]);
				assert.notEqual(role.name, 'Updated Role');
				role = await role.update({name: 'Updated Role'});
				assert.equal(role.id, ids[0]);
				assert.equal(role.name, 'Updated Role');
				assert(role.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should update the correct object', async () => {
				var role = await Role.get(conn, id);
				assert.equal(role.id, id);
				role = await role.delete();
				assert.equal(role.id, id);
			});
		});

	});







	after(async () => {
		await Promise.all(ids.map(id => Role.delete(conn, id)));
		await conn.close();
	});

});
