'use strict';

import chai from 'chai';
import url from 'url';

var assert = chai.assert;
require('../../init.js');

describe('Strategy: Password', () => {

	it('should return 404 for nonexistant user', done => {
		agent.post('/v1/session/secret')
		.send({
			user_id: 'this-does-not-exist',
			secret: 'da8ad1c19e0f'
		})
		.expect(404)
		.end(done);
	});

	it('should return 401 for an incorrect secret', done => {
		agent.post('/v1/session/secret')
		.send({
			user_id: '1691f38d-92c8-4d86-9a89-da99528cfcb5',
			secret: 'wrong'
		})
		.expect(401)
		.end(done);
	});

	it('should return 200 upon successful login', done => {
		agent.post('/v1/session/secret')
		.send({
			user_id: '1691f38d-92c8-4d86-9a89-da99528cfcb5',
			secret: 'da8ad1c19e0f'
		})
		.expect(200)
		.expect(res => {
			assert.isString(res.body.access_token)
		})
		.end(done);
	});

	it('should accept a form-encoded body', done => {
		agent.post('/v1/session/secret')
		.set('Content-Type', 'application/x-www-form-urlencoded')
		.send('secret=da8ad1c19e0f&user_id=1691f38d-92c8-4d86-9a89-da99528cfcb5')
		.expect(200)
		.end(done);
	});

	it('should accept HTTP basic credentials', done => {
		agent.get('/v1/session/secret')
		.set('Authorization', 'Basic MTY5MWYzOGQtOTJjOC00ZDg2LTlhODktZGE5OTUyOGNmY2I1OmRhOGFkMWMxOWUwZg==')
		.expect(200)
		.end(done);
	});

});
