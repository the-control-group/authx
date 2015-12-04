import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import Role from '../models/Role';

export async function post(ctx) {
	await protect(ctx, 'AuthX:role:create');
	var data = await json(ctx.req);
	ctx.body = await Role.create(ctx.conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	await protect(ctx, 'AuthX:role.*:read', false);
	var roles = await Role.query(ctx.conn);
	ctx.body = await Promise.filter(roles, r => can(ctx, 'AuthX:role.' + r.id + ':get'));
}

export async function get(ctx) {
	await protect(ctx, 'AuthX:role.' + ctx.params.role_id + ':read');
	ctx.body = await Role.get(ctx.conn, ctx.params.role_id);
}

export async function patch(ctx) {
	await protect(ctx, 'AuthX:role.' + ctx.params.role_id + ':update');
	var data = await json(ctx.req);

	if (typeof data.assignments !== 'undefined')
		await protect(ctx, 'AuthX:role.' + ctx.params.role_id + ':update.assignments');

	if (typeof data.scopes !== 'undefined')
		await protect(ctx, 'AuthX:role.' + ctx.params.role_id + ':update.scopes');

	ctx.body = await Role.update(ctx.conn, ctx.params.role_id, data);
}

export async function del(ctx) {
	await protect(ctx, 'AuthX:role.' + ctx.params.role_id + ':delete');
	ctx.body = await Role.delete(ctx.conn, ctx.params.role_id);
}
