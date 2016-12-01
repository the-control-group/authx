const Promise = require('bluebird');
const json = require('../util/json');
const {protect, can} = require('../util/protect');
const Client = require('../models/Client');
const x = require('../namespace');

module.exports.post = async function post(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':client:create');
	var data = await json(ctx.req);
	ctx.body = await Client.create(ctx[x].conn, data);
	ctx.status = 201;
};

module.exports.query = async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':authority.*:read', false);
	var clients = await Client.query(ctx[x].conn);
	ctx.body = await Promise.filter(clients, c => can(ctx, ctx[x].authx.config.realm + ':client.' + c.id + ':read'));
};

module.exports.get = async function get(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':client.' + ctx.params.client_id + ':read');
	ctx.body = await Client.get(ctx[x].conn, ctx.params.client_id);
};

module.exports.patch = async function patch(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':client.' + ctx.params.client_id + ':update');
	var data = await json(ctx.req);

	if (typeof data.scopes !== 'undefined')
		await protect(ctx, ctx[x].authx.config.realm + ':client.' + ctx.params.client_id + ':update.scopes');

	ctx.body = await Client.update(ctx[x].conn, ctx.params.client_id, data);
};

module.exports.del = async function del(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':client.' + ctx.params.client_id + ':delete');
	ctx.body = await Client.delete(ctx[x].conn, ctx.params.client_id);
};
