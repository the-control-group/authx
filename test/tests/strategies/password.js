'use strict';

const chai = require('chai');
const url = require('url');

var assert = chai.assert;
require('../../init.js');

describe('Strategy: Password', () => {

	it('should return 404 for nonexistant user', done => {
		agent.post('/v1/session/password')
		.send({
			username: ['password', 'this-does-not-exist'],
			password: '123456'
		})
		.expect(404)
		.end(done);
	});

	it('should return 401 for an incorrect password', done => {
		agent.post('/v1/session/password')
		.send({
			username: ['password', 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb'],
			password: 'wrong'
		})
		.expect(401)
		.end(done);
	});

	it('should return 200 upon successful login', done => {
		agent.post('/v1/session/password')
		.send({
			username: ['password', 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb'],
			password: '123456'
		})
		.expect(200)
		.end(done);
	});

	it('should identify users by the IDs of other authorities', done => {
		agent.post('/v1/session/password')
		.send({
			username: ['email', 'michael.scott@dundermifflin.com'],
			password: '123456'
		})
		.expect(200)
		.end(done);
	});

	it('should accept a form-encoded body', done => {
		agent.post('/v1/session/password')
		.set('Content-Type', 'application/x-www-form-urlencoded')
		.send('password=123456&username=password&username=a6a0946d-eeb4-45cd-83c6-c7920f2272eb')
		.expect(200)
		.end(done);
	});

	it('should accept HTTP basic credentials', done => {
		agent.get('/v1/session/password')
		.set('Authorization', 'Basic WyJlbWFpbCIsIm1pY2hhZWwuc2NvdHRAZHVuZGVybWlmZmxpbi5jb20iXToxMjM0NTY=')
		.expect(200)
		.end(done);
	});

});
