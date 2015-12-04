'use strict';

import r from 'rethinkdb';
import {assert} from 'chai';
import * as errors from '../../../lib/errors';
import Authority from '../../../lib/models/Authority';
import Credential from '../../../lib/models/Credential';

require('../../init.js');

var conn;
before(async () => {
	conn = await r.connect(global.setup.config.db);
});

var ids = [];
describe('Authority', () => {


	// Static Methods
	// --------------

	describe('(static methods)', () => {

		describe('query', () => {
			it('should return all objects', async () => {
				var authoritys = await Authority.query(conn);
				assert.isArray(authoritys);
				assert.lengthOf(authoritys, 3);
			});
			it('accepts a query tranformation argument', async () => {
				var authoritys = await Authority.query(conn, (q) => q.filter({strategy: 'google'}));
				assert.isArray(authoritys);
				assert.lengthOf(authoritys, 1);
			});
		});


		describe('create', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Authority.create(conn, {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should create a new object', async () => {
				var authority = await Authority.create(conn, {name: 'Created Authority', strategy: '2factor'});
				assert.isString(authority.id);
				assert.equal(authority.name, 'Created Authority');
				assert(authority.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(authority.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(authority.id);
			});
		});


		describe('get', () => {
			it('should fail to find a nonexistant object', async () => {
				try {
					await Authority.get(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should fetch the correct object', async () => {
				var authority = await Authority.get(conn, 'password');
				assert.equal(authority.id, 'password');
			});
		});


		describe('save', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Authority.save(conn, 'test-static-save', {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should save a new object', async () => {
				var authority = await Authority.save(conn, 'test-static-save', {id: 'test-static-save', name: 'Saved New Authority', strategy: '2factor'});
				assert.isString(authority.id);
				assert.equal(authority.name, 'Saved New Authority');
				assert(authority.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(authority.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(authority.id);
			});
			it('should save an existing object', async () => {
				var authority = await Authority.update(conn, 'test-static-save', {id: 'test-static-save', name: 'Saved Existing Authority', strategy: '2factor'});
				assert.equal(authority.id, 'test-static-save');
				assert.equal(authority.name, 'Saved Existing Authority');
				assert(authority.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should fail to find a nonexistant object', async () => {
				try {
					await Authority.update(conn, 'i-dont-exist', {});
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should update the correct object', async () => {
				var authority = await Authority.update(conn, ids[0], {name: 'Updated Authority'});
				assert.equal(authority.id, ids[0]);
				assert.equal(authority.name, 'Updated Authority');
				assert(authority.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should fail to find a nonexistant object', async () => {
				try {
					await Authority.delete(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should delete the correct object', async () => {
				var authority = await Authority.delete(conn, id);
				assert.equal(authority.id, id);
			});
			it('should fail to find a deleted object', async () => {
				try {
					await Authority.get(conn, id);
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
			var authority = await Authority.create(conn, {name: 'Created Authority', strategy: '2factor'});
			assert.isString(authority.id);
			ids.push(authority.id);
		});


		describe('credentials', () => {
			it('should return all assigned credentials', async () => {
				var authority = await Authority.get(conn, 'password');
				var credentials = await authority.credentials();
				assert.isArray(credentials);
				assert.lengthOf(credentials, 8);
				credentials.forEach(credential => assert.instanceOf(credential, Credential));
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should update the correct object', async () => {
				var authority = await Authority.get(conn, ids[0]);
				assert.equal(authority.id, ids[0]);
				assert.notEqual(authority.name, 'Updated Authority');
				authority = await authority.update({name: 'Updated Authority'});
				assert.equal(authority.id, ids[0]);
				assert.equal(authority.name, 'Updated Authority');
				assert(authority.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should update the correct object', async () => {
				var authority = await Authority.get(conn, id);
				assert.equal(authority.id, id);
				authority = await authority.delete();
				assert.equal(authority.id, id);
			});
		});

	});







	after(async () => {
		await Promise.all(ids.map(id => Authority.delete(conn, id)));
		await conn.close();
	});

});
