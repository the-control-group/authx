import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import Role from '../models/Role';
import x from '../namespace';

export async function post(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role:create');
	var data = await json(ctx.req);
	ctx.body = await Role.create(ctx[x].conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.*:read', false);
	var roles = await Role.query(ctx[x].conn);
	ctx.body = await Promise.filter(roles, r => can(ctx, ctx[x].authx.config.realm + ':role.' + r.id + ':get'));
}

export async function get(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':read');
	ctx.body = await Role.get(ctx[x].conn, ctx.params.role_id);
}

export async function patch(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update');
	var data = await json(ctx.req);

	if (typeof data.assignments !== 'undefined')
		await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update.assignments');

	if (typeof data.scopes !== 'undefined')
		await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update.scopes');

	ctx.body = await Role.update(ctx[x].conn, ctx.params.role_id, data);
}

export async function del(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':delete');
	ctx.body = await Role.delete(ctx[x].conn, ctx.params.role_id);
}
