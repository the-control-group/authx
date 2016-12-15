const Promise = require('bluebird');
const json = require('../util/json');
const {protect, can} = require('../util/protect');
const Role = require('../models/Role');
const x = require('../namespace');

module.exports.post = async function post(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role:create');
	var data = await json(ctx.req);
	ctx.body = await Role.create(ctx[x].conn, data);
	ctx.status = 201;
};

module.exports.query = async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.*:read', false);
	var roles = await Role.query(ctx[x].conn);
	ctx.body = await Promise.filter(roles, r => can(ctx, ctx[x].authx.config.realm + ':role.' + r.id + ':read'));
};

module.exports.get = async function get(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':read');
	ctx.body = await Role.get(ctx[x].conn, ctx.params.role_id);
};

module.exports.patch = async function patch(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update');
	var data = await json(ctx.req);

	if (typeof data.assignments !== 'undefined')
		await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update.assignments');

	if (typeof data.scopes !== 'undefined')
		await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update.scopes');

	ctx.body = await Role.update(ctx[x].conn, ctx.params.role_id, data);
};

module.exports.del = async function del(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':delete');
	ctx.body = await Role.delete(ctx[x].conn, ctx.params.role_id);
};
