'use strict';

const Router = require('koa-router');
const users = require('./users');
const groups = require('./groups');

const e = require('./namespace');

class SCIMExtension extends Router {
	constructor(config) {
		super(config);

		// set the config
		this.config = config;

		// Middleware
		// ==========

		// return a middleware that sets up the namespace
		this.middleware = (ctx, next) => {
			ctx[e] = this;
			return next();
		};

		// add authx extention namespace context
		this.use(this.middleware);

		// Groups
		// ======

		this.post('/Groups', groups.post);
		this.get('/Groups', groups.query);
		this.get('/Groups/:role_id', groups.get);
		this.patch('/Groups/:role_id', groups.patch);
		this.put('/Groups/:role_id', groups.put);
		this.del('/Groups/:role_id', groups.del);

		// Users
		// =====

		this.post('/Users', users.post);
		this.get('/Users', users.query);
		this.get('/Users/:user_id', users.get);
		this.patch('/Users/:user_id', users.patch);
		this.put('/Users/:user_id', users.put);
		this.del('/Users/:user_id', users.del);
	}
}

module.exports = SCIMExtension;
