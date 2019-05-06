'use strict';

var url = require('url');
var assert = require('chai').assert;

require('../../init.js');

describe('Tokens', () => {
	var authorization_code;

	describe('Authorization Code', () => {
		it('should return 400 without further details', done => {
			agent
				.get('/v1/tokens')
				.expect(400)
				.end(done);
		});
		it('should return 404 for an unknown client', done => {
			agent
				.get('/v1/tokens')
				.query({
					response_type: 'code',
					client_id: 'foo',
					redirect_uri: 'https://www.example.com',
					scope: 'AuthX:me:read',
					state: 'xyz'
				})
				.expect(404)
				.end(done);
		});
		it('should redirect to log in the user', done => {
			agent
				.get('/v1/tokens')
				.query({
					response_type: 'code',
					client_id: 'dundermifflin-inventory',
					redirect_uri: 'https://www.example.com',
					scope: 'AuthX:me:read',
					state: 'xyz'
				})
				.expect(302)
				.end(done);
		});
		it('should redirect to `redirect_uri` with an authorization code and state', done => {
			var logged_in_agent = agent;

			// authenticate (sets a cookie)
			logged_in_agent
				.post('/v1/session/password')
				.send({
					username: ['password', 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb'],
					password: '123456'
				})
				.expect(200)
				.end(err => {
					if (err) return done(err);

					// the agent is actually a getter, and will respond with the cookie
					logged_in_agent
						.get('/v1/tokens')
						.query({
							response_type: 'code',
							client_id: 'dundermifflin-inventory',
							redirect_uri: 'https://www.example.com',
							scope: 'AuthX:me:read',
							state: 'xyz'
						})
						.expect(302)
						.expect(res => {
							assert.isString(res.headers.location);
							var query = url.parse(res.headers.location, true).query;
							assert.isString(query.code);
							assert.equal(query.state, 'xyz');
							authorization_code = query.code;
						})
						.end(done);
				});
		});
	});

	var refresh_token;
	describe('Authorization Code => Access Token', () => {
		it('should return 404 for an unknown client', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'foo',
					client_secret: 'sadkhfjl',
					grant_type: 'authorization_code',
					authorization_code: 'asilduf'
				})
				.expect(404)
				.end(done);
		});
		it('should return 403 for an incorrect client secret', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'dundermifflin-inventory',
					client_secret: 'sadkhfjl',
					grant_type: 'authorization_code',
					authorization_code: 'asilduf'
				})
				.expect(403)
				.end(done);
		});

		it('should return 404 for an incorrect authorization code', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'dundermifflin-inventory',
					client_secret:
						'1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2',
					grant_type: 'authorization_code',
					code:
						'WyIzYjIxMmI3YS01MDQyLTQwYjItOWVkMC01YzQ5ZWE2NTM2YjciLCI4ODM5Njk1Yy04MzFkLTRmMGItYmU1MC04Njk3NDY0NWRmZTAiXQ=='
				})
				.expect(404)
				.end(done);
		});
		it('should return a valid response', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'dundermifflin-inventory',
					client_secret:
						'1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2',
					grant_type: 'authorization_code',
					code: authorization_code
				})
				.expect(res => {
					assert.isString(res.body.access_token);
					assert.isString(res.body.refresh_token);
					assert.isArray(res.body.scope);
					assert.isObject(res.body.user);
					refresh_token = res.body.refresh_token;
				})
				.expect(200)
				.end(done);
		});
		it('should refuse to process the same authorization code twice', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'dundermifflin-inventory',
					client_secret:
						'1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2',
					grant_type: 'authorization_code',
					code: authorization_code
				})
				.expect(404)
				.end(done);
		});
	});

	describe('Refresh Token => Access Token', () => {
		it('should return 404 for an unknown client', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'foo',
					client_secret: 'sadkhfjl',
					grant_type: 'refresh_token',
					authorization_code: 'asilduf'
				})
				.expect(404)
				.end(done);
		});
		it('should return 403 for an incorrect client secret', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'dundermifflin-inventory',
					client_secret: 'sadkhfjl',
					grant_type: 'refresh_token',
					authorization_code: 'asilduf'
				})
				.expect(403)
				.end(done);
		});

		it('should return a valid response', done => {
			agent
				.post('/v1/tokens')
				.send({
					client_id: 'dundermifflin-inventory',
					client_secret:
						'1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2',
					grant_type: 'refresh_token',
					refresh_token: refresh_token
				})
				.expect(res => {
					assert.isString(res.body.access_token);
					assert.isString(res.body.refresh_token);
					assert.isArray(res.body.scope);
					assert.isObject(res.body.user);
					refresh_token = res.body.refresh_token;
				})
				.expect(200)
				.end(done);
		});
	});
});
