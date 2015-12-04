'use strict';

import r from 'rethinkdb';
import {assert} from 'chai';
import * as errors from '../../../src/errors';
import Authority from '../../../src/models/Authority';
import Credential from '../../../src/models/Credential';
import User from '../../../src/models/User';

require('../../init.js');

var conn;
before(async () => {
	conn = await r.connect(global.setup.config.db);
});

var ids = [];
describe('Credential', () => {


	// Static Methods
	// --------------

	describe('(static methods)', () => {

		describe('query', () => {
			it('should return all objects', async () => {
				var credentials = await Credential.query(conn);
				assert.isArray(credentials);
				assert.lengthOf(credentials, 16);
			});
			it('accepts a query tranformation argument', async () => {
				var credentials = await Credential.query(conn, (q) => q.filter({details: {hash: '$2a$04$GM8OJ7/Oq4H2Q.d9Yk3Ga.ffKmrUez7EYTHmEoX7jHpkDmmepl1/W'}}));
				assert.isArray(credentials);
				assert.lengthOf(credentials, 1);
			});
		});


		describe('create', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Credential.create(conn, {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should reject a mismatched profile ID', async () => {
				try {
					var credential = await Credential.create(conn, {id: ['email', 'support@dundermifflin.com'], user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9', details: {token: 'Created Credential'}, profile: {id: 'foo', displayName: 'Dunder Mifflin Support'}});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should create a new object without a profile', async () => {
				var credential = await Credential.create(conn, {id: ['email', 'help@dundermifflin.com'], user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9', details: {token: 'Created Credential'}});
				assert.isArray(credential.id);
				assert.equal(credential.id[0], 'email');
				assert.equal(credential.id[1], 'help@dundermifflin.com');
				assert.equal(credential.details.token, 'Created Credential');
				// assert.equal(credential.profile.id, credential.id[1]);
				assert.isNull(credential.last_used);
				assert(credential.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(credential.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(credential.id);
			});
			it('should create a new object with a profile', async () => {
				var credential = await Credential.create(conn, {id: ['email', 'support@dundermifflin.com'], user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9', details: {token: 'Created Credential'}, profile: {id: 'support@dundermifflin.com', displayName: 'Dunder Mifflin Support'}});
				assert.isArray(credential.id);
				assert.equal(credential.id[0], 'email');
				assert.equal(credential.id[1], 'support@dundermifflin.com');
				assert.equal(credential.details.token, 'Created Credential');
				assert.equal(credential.profile.id, credential.id[1]);
				assert.isNull(credential.last_used);
				assert(credential.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(credential.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(credential.id);
			});
		});


		describe('get', () => {
			it('should fail to find a nonexistant object', async () => {
				try {
					await Credential.get(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should fetch the correct object', async () => {
				var credential = await Credential.get(conn, ['email', 'jim.halpert@dundermifflin.com']);
				assert.isArray(credential.id);
				assert.equal(credential.id[0], 'email');
				assert.equal(credential.id[1], 'jim.halpert@dundermifflin.com');
			});
		});


		describe('save', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Credential.save(conn, 'test-static-save', {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should save a new object', async () => {
				var credential = await Credential.save(conn, ['email', 'frontdesk@dundermifflin.com'], {id: ['email', 'frontdesk@dundermifflin.com'], user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9', details: {token: 'Saved New Credential'}, profile: {id: 'frontdesk@dundermifflin.com', displayName: 'Dunder Mifflin Support'}});
				assert.deepEqual(credential.id, ['email', 'frontdesk@dundermifflin.com']);
				assert.equal(credential.details.token, 'Saved New Credential');
				assert(credential.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(credential.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(credential.id);
			});
			it('should save an existing object', async () => {
				var credential = await Credential.save(conn, ['email', 'frontdesk@dundermifflin.com'], {id: ['email', 'frontdesk@dundermifflin.com'], user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9', details: {token: 'Saved Existing Credential'}, profile: {id: 'frontdesk@dundermifflin.com', displayName: 'Dunder Mifflin Support'}});
				assert.deepEqual(credential.id, ['email', 'frontdesk@dundermifflin.com']);
				assert.equal(credential.details.token, 'Saved Existing Credential');
				assert(credential.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should fail to find a nonexistant object', async () => {
				try {
					await Credential.update(conn, 'i-dont-exist', {});
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should update the correct object', async () => {
				var credential = await Credential.update(conn, ids[0], {details: {token: 'Updated Credential'}});
				assert.equal(credential.id[0], ids[0][0]);
				assert.equal(credential.id[1], ids[0][1]);
				assert.equal(credential.details.token, 'Updated Credential');
				assert(credential.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should fail to find a nonexistant object', async () => {
				try {
					await Credential.delete(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should delete the correct object', async () => {
				var credential = await Credential.delete(conn, id);
				assert.equal(credential.id[0], id[0]);
				assert.equal(credential.id[1], id[1]);
			});
			it('should fail to find a deleted object', async () => {
				try {
					await Credential.get(conn, id);
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
			var credential = await Credential.create(conn, {id: ['email', 'help@dundermifflin.com'], user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9', details: {token: 'Created Credential'}});
			assert.isArray(credential.id);
			ids.push(credential.id);
		});


		describe('user', () => {
			it('should return the associated user', async () => {
				var credential = await Credential.get(conn, ['email', 'darryl.philbin@dundermifflin.com']);
				var user = await credential.user();
				assert.instanceOf(user, User);
			});
		});


		describe('authority', () => {
			it('should return the associated authority', async () => {
				var credential = await Credential.get(conn, ['email', 'darryl.philbin@dundermifflin.com']);
				var authority = await credential.authority();
				assert.instanceOf(authority, Authority);
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should update the correct object', async () => {
				var credential = await Credential.get(conn, ids[0]);
				assert.equal(credential.id[0], ids[0][0]);
				assert.equal(credential.id[1], ids[0][1]);
				assert.notEqual(credential.name, 'Updated Credential');
				credential = await credential.update({details: {token: 'Updated Credential'}});
				assert.equal(credential.id[0], ids[0][0]);
				assert.equal(credential.id[1], ids[0][1]);
				assert.equal(credential.details.token, 'Updated Credential');
				assert(credential.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should update the correct object', async () => {
				var credential = await Credential.get(conn, id);
				assert.equal(credential.id[0], id[0]);
				assert.equal(credential.id[1], id[1]);
				credential = await credential.delete();
				assert.equal(credential.id[0], id[0]);
				assert.equal(credential.id[1], id[1]);
			});
		});

	});







	after(async () => {
		await Promise.all(ids.map(id => Credential.delete(conn, id)));
		await conn.close();
	});

});
