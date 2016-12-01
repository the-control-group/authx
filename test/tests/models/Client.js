'use strict';

const r = require('rethinkdb');
const {assert} = require('chai');
const errors = require('../../../src/errors');
const Client = require('../../../src/models/Client');

require('../../init.js');

var conn;
before(async () => {
	conn = await r.connect(global.setup.config.db);
});

var ids = [];
describe('Client', () => {


	// Static Methods
	// --------------

	describe('(static methods)', () => {

		describe('query', () => {
			it('should return all objects', async () => {
				var clients = await Client.query(conn);
				assert.isArray(clients);
				assert.lengthOf(clients, 2);
			});
			it('accepts a query tranformation argument', async () => {
				var clients = await Client.query(conn, (q) => q.filter({name: 'Dunder Mifflin Inventory Portal'}));
				assert.isArray(clients);
				assert.lengthOf(clients, 1);
			});
		});


		describe('create', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Client.create(conn, {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should create a new object', async () => {
				var client = await Client.create(conn, {name: 'Created Client', secret: '05687eac667178f54c2974795925a1519bd3ad5b384b93b0af8a3495e2ba78bf'});
				assert.isString(client.id);
				assert.equal(client.name, 'Created Client');
				assert(client.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(client.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(client.id);
			});
		});


		describe('get', () => {
			it('should fail to find a nonexistant object', async () => {
				try {
					await Client.get(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should fetch the correct object', async () => {
				var client = await Client.get(conn, 'dundermifflin-inventory');
				assert.equal(client.id, 'dundermifflin-inventory');
			});
		});


		describe('save', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should reject an invalid object', async () => {
				try {
					await Client.save(conn, 'test-static-save', {foo: 'bar'});
				} catch (err) {
					assert.instanceOf(err, errors.ValidationError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should save a new object', async () => {
				var client = await Client.save(conn, 'test-static-save', {id: 'test-static-save', name: 'Saved New Client', secret: 'd240e3049355259b49b902e2d7559c572add7b6264378cddd231ad9ca3004500'});
				assert.isString(client.id);
				assert.equal(client.name, 'Saved New Client');
				assert(client.created >= time, 'Expected `created` timestamp to be after ' + time);
				assert(client.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
				ids.push(client.id);
			});
			it('should save an existing object', async () => {
				var client = await Client.save(conn, 'test-static-save', {id: 'test-static-save', name: 'Saved Existing Client', secret: '3eb7de2d16504aa4fcf19bc71082d6711ea2266316b16d9e5582b6a170430c0e'});
				assert.equal(client.id, 'test-static-save');
				assert.equal(client.name, 'Saved Existing Client');
				assert(client.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should fail to find a nonexistant object', async () => {
				try {
					await Client.update(conn, 'i-dont-exist', {});
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should update the correct object', async () => {
				var client = await Client.update(conn, ids[0], {name: 'Updated Client'});
				assert.equal(client.id, ids[0]);
				assert.equal(client.name, 'Updated Client');
				assert(client.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should fail to find a nonexistant object', async () => {
				try {
					await Client.delete(conn, 'i-dont-exist');
				} catch (err) {
					assert.instanceOf(err, errors.NotFoundError);
					return;
				}
				throw new Error('Should throw an error.');
			});
			it('should delete the correct object', async () => {
				var client = await Client.delete(conn, id);
				assert.equal(client.id, id);
			});
			it('should fail to find a deleted object', async () => {
				try {
					await Client.get(conn, id);
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
			var client = await Client.create(conn, {name: 'Created Client', secret: 'aeb20b23eb74a51dfbb910b4c9742dd019c02925de3d17bc89566c659c991852'});
			assert.isString(client.id);
			ids.push(client.id);
		});


		describe('update', () => {
			var time;
			before(() => time = Date.now() / 1000);
			it('should update the correct object', async () => {
				var client = await Client.get(conn, ids[0]);
				assert.equal(client.id, ids[0]);
				assert.notEqual(client.name, 'Updated Client');
				client = await client.update({name: 'Updated Client'});
				assert.equal(client.id, ids[0]);
				assert.equal(client.name, 'Updated Client');
				assert(client.last_updated >= time, 'Expected `last_updated` timestamp to be after ' + time);
			});
		});


		describe('delete', () => {
			var id;
			before(() => id = ids.shift() );
			it('should update the correct object', async () => {
				var client = await Client.get(conn, id);
				assert.equal(client.id, id);
				client = await client.delete();
				assert.equal(client.id, id);
			});
		});

	});







	after(async () => {
		await Promise.all(ids.map(id => Client.delete(conn, id)));
		await conn.close();
	});

});
