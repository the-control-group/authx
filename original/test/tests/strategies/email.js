'use strict';

const chai = require('chai');

var assert = chai.assert;
require('../../init.js');

describe('Strategy: Email', () => {
	var messages = [];
	var mail;

	// stub out the mail function
	before(() => {
		mail = authx.strategies.email.prototype.mail;
		authx.strategies.email.prototype.mail = m => messages.unshift(m);
	});

	it('should return 400 for an invalid request', done => {
		agent
			.post('/v1/session/email')
			.expect(400)
			.end(done);
	});

	it('should return 404 for nonexistant user', done => {
		agent
			.post('/v1/session/email')
			.send({
				email: 'this-does-not-exist'
			})
			.expect(404)
			.end(done);
	});

	it('should return 202 for a valid email', done => {
		agent
			.post('/v1/session/email')
			.send({
				email: 'michael.scott@dundermifflin.com'
			})
			.expect(202)
			.end(done);
	});

	it('should send a token for a valid email', () => {
		assert.equal(messages[0].to, 'michael.scott@dundermifflin.com');
		assert.equal(messages[0].subject, 'Reset your password');
		assert.match(messages[0].html, /^<a href="http/);
		assert.isString(messages[0].text);
	});

	it('should return 401 for an invalid token', done => {
		agent
			.get('/v1/session/email')
			.query({
				token: 'foo'
			})
			.expect(401)
			.end(done);
	});

	it('should return 401 for an invalid token', done => {
		agent
			.get('/v1/session/email')
			.query({
				token: 'foo'
			})
			.expect(401)
			.end(done);
	});

	it('should return 200 for a valid token', done => {
		agent
			.get('/v1/session/email')
			.query({
				token: messages[0].text
			})
			.expect(200)
			.end(done);
	});

	// replace original mail function
	after(() => {
		authx.strategies.email.prototype.mail = mail;
	});
});
