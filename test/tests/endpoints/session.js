'use strict';

import chai from 'chai';
import url from 'url';

var assert = chai.assert;
require('../../init.js');

describe('Session', () => {

	it('should return 404 for an invalid authority', done => {
		agent.get('/v1/session/foo')
		.expect(404)
		.end(done);
	});

	it('should return 404 for nonexistant user', done => {
		agent.post('/v1/session/password')
		.send({
			username: ['password', 'this-does-not-exist'],
			password: '123456'
		})
		.expect(404)
		.end(done);
	});

	it('should return 200 with a session cookie upon successful login', done => {
		agent.post('/v1/session/password')
		.send({
			username: ['password', 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb'],
			password: '123456'
		})
		.expect(200)
		.expect(res => {
			if(!res.headers['set-cookie'].some(c => /^session=.+/.test(c)))
				throw new Error('Expect a cookie with the name `session`.');
		})
		.end(done);
	});

	it('should redirect with ?status=404 for nonexistant user', done => {
		agent.post('/v1/session/password')
		.query({
			url: 'http://www.example.com/'
		})
		.send({
			username: ['password', 'this-does-not-exist'],
			password: '123456'
		})
		.expect(302)
		.expect(res => {
			var query = url.parse(res.headers.location, true).query;
			assert.equal(query.status, '404');
			JSON.parse(query.body);
		})
		.end(done);
	});

	it('should redirect with ?status=200 and a session cookie upon successful login', done => {
		agent.post('/v1/session/password')
		.query({
			url: 'http://www.example.com/'
		})
		.send({
			username: ['password', 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb'],
			password: '123456'
		})
		.expect(302)
		.expect(res => {
			var query = url.parse(res.headers.location, true).query;
			assert.equal(query.status, '200');
			JSON.parse(query.body);
		})
		.expect(res => {
			if(!res.headers['set-cookie'].some(c => /^session=.+/.test(c)))
				throw new Error('Expect a cookie with the name `session`.');
		})
		.end(done);
	});

});
