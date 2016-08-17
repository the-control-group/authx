import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import Grant from '../models/Grant';
import x from '../namespace';

export async function post(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':grant:create');
	var data = await json(ctx.req);
	ctx.body = await Grant.create(ctx[x].conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':grant.*.*:read', false);
	var grants = await Grant.query(ctx[x].conn, (await can(ctx, ctx[x].authx.config.realm + ':grant.*.user:read', false)) ? undefined : x => x.getAll(ctx.user.id, {index: 'user_id'}));
	ctx.body = await Promise.filter(grants, g => can(ctx, ctx[x].authx.config.realm + ':grant.' + g.client_id + '.' +(ctx.user && ctx.user.id === g.user_id ? 'me' : 'user') +  ':read'));
}

export async function get(ctx) {
	var grant = await Grant.get(ctx[x].conn, ctx.params.grant_id);
	await protect(ctx, ctx[x].authx.config.realm + ':grant.' + grant.client_id + '.' +(ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':read');
	ctx.body = grant;
}

export async function patch(ctx) {
	var data = await json(ctx.req);
	var grant = await Grant.get(ctx[x].conn, ctx.params.grant_id);
	await protect(ctx, ctx[x].authx.config.realm + ':grant.' + grant.client_id + '.' +(ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':update');
	ctx.body = await grant.update(data);
}

export async function del(ctx) {
	var grant = await Grant.get(ctx[x].conn, ctx.params.grant_id);
	await protect(ctx, ctx[x].authx.config.realm + ':grant.' + grant.client_id + '.' +(ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':delete');
	ctx.body = await Grant.delete(ctx[x].conn, ctx.params.grant_id);
}
