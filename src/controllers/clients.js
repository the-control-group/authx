import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import Client from '../models/Client';

export async function post(ctx) {
	await protect(ctx, 'AuthX:client:create');
	var data = await json(ctx.req);
	ctx.body = await Client.create(ctx.conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	await protect(ctx, 'AuthX:authority.*:read', false);
	var clients = await Client.query(ctx.conn);
	ctx.body = await Promise.filter(clients, c => can(ctx, 'AuthX:client.' + c.id + ':read'));
}

export async function get(ctx) {
	await protect(ctx, 'AuthX:client.' + ctx.params.client_id + ':read');
	ctx.body = await Client.get(ctx.conn, ctx.params.client_id);
}

export async function patch(ctx) {
	await protect(ctx, 'AuthX:client.' + ctx.params.client_id + ':update');
	var data = await json(ctx.req);

	if (typeof data.scopes !== 'undefined')
		await protect(ctx, 'AuthX:client.' + ctx.params.client_id + ':update.scopes');

	ctx.body = await Client.update(ctx.conn, ctx.params.client_id, data);
}

export async function del(ctx) {
	await protect(ctx, 'AuthX:client.' + ctx.params.client_id + ':delete');
	ctx.body = await Client.delete(ctx.conn, ctx.params.client_id);
}
