import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import Grant from '../models/Grant';

export async function post(ctx) {
	await protect(ctx, 'AuthX:grant:create');
	var data = await json(ctx.req);
	ctx.body = await Grant.create(ctx.conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	await protect(ctx, 'AuthX:grant.*.*:read', false);
	var grants = await Grant.query(ctx.conn, (await can(ctx, 'AuthX:grant.*.user:read', false)) ? undefined : x => x.getAll(ctx.user.id, {index: 'user_id'}));
	ctx.body = await Promise.filter(grants, g => can(ctx, 'AuthX:grant.' + g.client_id + '.' +(ctx.user && ctx.user.id === g.user_id ? 'me' : 'user') +  ':read'));
}

export async function get(ctx) {
	var grant = await Grant.get(ctx.conn, ctx.params.grant_id);
	await protect(ctx, 'AuthX:grant.' + grant.client_id + '.' +(ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':read');
	ctx.body = grant;
}

export async function patch(ctx) {
	var data = await json(ctx.req);
	var grant = await Grant.get(ctx.conn, ctx.params.grant_id);
	await protect(ctx, 'AuthX:grant.' + grant.client_id + '.' +(ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':update');
	ctx.body = await grant.update(data);
}

export async function del(ctx) {
	var grant = await Grant.get(ctx.conn, ctx.params.grant_id);
	await protect(ctx, 'AuthX:grant.' + grant.client_id + '.' +(ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':delete');
	ctx.body = await Grant.delete(ctx.conn, ctx.params.grant_id);
}
