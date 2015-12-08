'use strict';

import r from 'rethinkdb';
import {assert} from 'chai';
import * as errors from '../../../src/errors';
import Client from '../../../src/models/Client';
import Grant from '../../../src/models/Grant';
import User from '../../../src/models/User';

require('../../init.js');

var conn;
before(async () => {
	conn = await r.connect(global.setup.config.db);
});

var ids = [];
describe('Grant', () => {


	// Static Methods
	// --------------

	describe('(static methods)', () => {

		describe('query', () => {
			it('should return all objects', async () => {
				var grants = await Grant.query(conn);
				assert.isArray(grants);
				assert.lengthOf(grants, 2);
			});
			it('accepts a query tranformation argument', async () => {
				var grants = await Grant.query(conn, (q) => q.filter({nonce: 'd122298d-55d9-4eee-9c17-463113669007'}));
				assert.isArray(grants);
				assert.lengthOf(grants, 1);
			});
		});


		describe('create', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Grant.create(conn, {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should create a new object', async () => {
				var grant = await Grant.create(conn, {id: ['1691f38d-92c8-4d86-9a89-da99528cfcb5', 'dundermifflin-inventory'], scopes: ['a:b:c']});
				assert.isArray(grant.id);
				assert.deepEqual(grant.scopes, ['a:b:c']);
				assert(grant.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(grant.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(grant.id);
			});
		});


		describe('get', () => {
			it('should fail to find a nonexistant object', async () => {
				try {
					await Grant.get(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should fetch the correct object', async () => {
				var grant = await Grant.get(conn, ['a6a0946d-eeb4-45cd-83c6-c7920f2272eb', 'dundermifflin-inventory']);
				assert.deepEqual(grant.id, ['a6a0946d-eeb4-45cd-83c6-c7920f2272eb', 'dundermifflin-inventory']);
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should fail to find a nonexistant object', async () => {
				try {
					await Grant.update(conn, 'i-dont-exist', {});
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should update the correct object', async () => {
				var grant = await Grant.update(conn, ids[0], {scopes: ['c:b:a']});
				assert.deepEqual(grant.id, ids[0]);
				assert.deepEqual(grant.scopes, ['c:b:a']);
				assert(grant.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should fail to find a nonexistant object', async () => {
				try {
					await Grant.delete(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should delete the correct object', async () => {
				var grant = await Grant.delete(conn, id);
				assert.deepEqual(grant.id, id);
			});
			it('should fail to find a deleted object', async () => {
				try {
					await Grant.get(conn, id);
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
			var grant = await Grant.create(conn, {id: ['306eabbb-cc2b-4f88-be19-4bb6ec98e5c3', 'dundermifflin-inventory'], scopes: ['a:b:c']});
			assert.isArray(grant.id);
			ids.push(grant.id);
		});


		describe('user', () => {
			it('should return the associated user', async () => {
				var grant = await Grant.get(conn, ids[0]);
				var user = await grant.user();
				assert.instanceOf(user, User);
			});
		});


		describe('client', () => {
			it('should return the associated user', async () => {
				var grant = await Grant.get(conn, ids[0]);
				var client = await grant.client();
				assert.instanceOf(client, Client);
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should update the correct object', async () => {
				var grant = await Grant.get(conn, ids[0]);
				assert.deepEqual(grant.id, ids[0]);
				assert.notDeepEqual(grant.scopes, ['c:b:a']);
				grant = await grant.update({scopes: ['c:b:a']});
				assert.deepEqual(grant.id, ids[0]);
				assert.deepEqual(grant.scopes, ['c:b:a']);
				assert(grant.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should update the correct object', async () => {
				var grant = await Grant.get(conn, id);
				assert.deepEqual(grant.id, id);
				grant = await grant.delete();
				assert.deepEqual(grant.id, id);
			});
		});

	});







	after(async () => {
		await Promise.all(ids.map(id => Grant.delete(conn, id)));
		await conn.close();
	});

});
