'use strict';

var assert = require('chai').assert;

require('../../init.js');

describe.skip('Users', function() {
	var ids = [];

	describe('#post', function() {

		it.skip('should reject an unauthorized request', done => {
			done();
		});

		it('should reject an invalid request', done => {
			agent.post('/resources/users')
			.send({foo: 'bar'})
			.expect(400)
			.expect(function(res) {
				assert.isObject(res.body);
				assert.isObject(res.body.validation);
			})
			.end(done);
		});

		it('should create a new user', done => {
			agent.post('/resources/users')
			.send({name: 'Stanley Hudson', type: 'human'})
			.expect(201)
			.expect(function(res) {
				assert.isObject(res.body);
				assert.isString(res.body.id);
				assert.equal(res.body.name, 'Stanley Hudson');

				ids.push(res.body.id);
			})
			.end(done);
		});

	});


	// TODO: clean up users
	after(done => {
		done();
	});

});
