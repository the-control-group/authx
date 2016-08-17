import Promise from 'bluebird';
import json from '../util/json';
import { protect, can } from '../util/protect';
import * as errors from '../errors';
import Authority from '../models/Authority';
import x from '../namespace';

export async function post(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':authority:create');
	var data = await json(ctx.req);

	// make sure a strategy is set
	if (!data.strategy)
		throw new errors.ValidationError('A valid authority must be supplied.', {strategy: {required: true}});

	// get the strategy
	var Strategy = ctx[x].authx.strategies[data.strategy];
	if (!Strategy)
		throw new errors.ValidationError('Strategy "' + data.strategy + '" not implemented.', {strategy: {enum: Object.keys(ctx[x].authx.strategies)}});

	// create the new authority
	ctx.body = await Strategy.createAuthority(ctx[x].conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':authority.*:read', false);
	var authorities = await Authority.query(ctx[x].conn);
	ctx.body = await Promise.filter(authorities, a => can(ctx, ctx[x].authx.config.realm + ':authority.' + a.id + ':read'));
}

export async function get(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':authority.' + ctx.params.authority_id + ':read');
	ctx.body = await Authority.get(ctx[x].conn, ctx.params.authority_id);
}

export async function patch(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':authority.' + ctx.params.authority_id + ':update');
	var data = await json(ctx.req);

	// get the existing authority
	var authority = await Authority.get(ctx[x].conn, ctx.params.authority_id);

	// make sure the strategy is not changed
	if (data.strategy && data.strategy !== authority.strategy)
		throw new errors.ValidationError('An authority\'s strategy cannot be changed.');

	// get the strategy
	var Strategy = ctx[x].authx.strategies[authority.strategy];
	if (!Strategy)
		throw new Error('Strategy "' + authority.strategy + '" not implemented.');

	// update the authority
	ctx.body = await Strategy.updateAuthority(authority, data);
}

export async function del(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':authority.' + ctx.params.authority_id + ':delete');

	// get the existing authority
	var authority = await Authority.get(ctx[x].conn, ctx.params.authority_id);

	// get the strategy
	var Strategy = ctx[x].authx.strategies[authority.strategy];
	if (!Strategy)
		throw new Error('Strategy "' + authority.strategy + '" not implemented.');

	// delete the authority
	ctx.body = await Strategy.deleteAuthority(authority);
}
