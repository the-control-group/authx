import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import * as errors from '../errors';
import Authority from '../models/Authority';
import Credential from '../models/Credential';
import User from '../models/User';
import x from '../namespace';

export async function post(ctx) {
	var data = await json(ctx.req);

	// make sure we can look up the user
	if (!data.user_id)
		throw new errors.ValidationError('A valid credential must be supplied.', {user_id: {required: true}});

	// make sure we can look up the authority
	if (!Array.isArray(data.id) || data.id.length !== 2)
		throw new errors.ValidationError('A valid credential must be supplied.', {id: {type: 'array', schema: {'0': {type: 'string'}, '1': {type: 'string'}}, additionalItems: false}});

	// protect the endpoint
	await protect(ctx, ctx[x].authx.config.realm + ':credential.' + data.id[0] + '.' +(ctx[x].user && ctx[x].user.id === data.user_id ? 'me' : 'user') + ':read');

	var [authority] = await Promise.all([

		// fetch the authority
		Authority.get(ctx[x].conn, data.id[0]).catch(err => {
			if (err instanceof errors.NotFoundError)
				throw new errors.ValidationError('The authority identified by `id[0]` does not exist.');

			throw err;
		}),

		// fetch the user
		User.get(ctx[x].conn, data.user_id).catch(err => {
			if (err instanceof errors.NotFoundError)
				throw new errors.ValidationError('The user identified by `user_id` does not exist.');

			throw err;
		})
	]);

	// get the strategy
	var Strategy = ctx[x].authx.strategies[authority.strategy];
	if (!Strategy)
		throw new Error('Strategy "' + authority.strategy + '" not implemented.');

	// instantiate the strategy
	var strategy = new Strategy(ctx[x].conn, authority);

	// create the credential
	ctx.body = await strategy.createCredential(data);
	ctx.status = 201;
}



export async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':credential.*.*:read', false);
	var credentials = await Credential.query(ctx[x].conn, (await can(ctx, ctx[x].authx.config.realm + ':credential.*.user:read', false)) ? undefined : x => x.getAll(ctx[x].user.id, {index: 'user_id'}));
	ctx.body = await Promise.filter(credentials, c => can(ctx, ctx[x].authx.config.realm + ':credential.' + c.authority_id + '.' +(ctx[x].user && ctx[x].user.id === c.user_id ? 'me' : 'user') +  ':read'));
}



export async function get(ctx) {
	var credential = await Credential.get(ctx[x].conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]);
	await protect(ctx, ctx[x].authx.config.realm + ':credential.' + credential.authority_id + '.' +(ctx[x].user && ctx[x].user.id === credential.user_id ? 'me' : 'user') + ':read');
	ctx.body = credential;
}



export async function patch(ctx) {
	var data = await json(ctx.req);
	var credential = await Credential.get(ctx[x].conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]);
	await protect(ctx, ctx[x].authx.config.realm + ':credential.' + credential.authority_id + '.' +(ctx[x].user && ctx[x].user.id === credential.user_id ? 'me' : 'user') + ':update');

	// fetch the authority
	var authority = await credential.authority();

	// get the strategy
	var Strategy = ctx[x].authx.strategies[authority.strategy];
	if (!Strategy)
		throw new Error('Strategy "' + authority.strategy + '" not implemented.');

	// instantiate the strategy
	var strategy = new Strategy(ctx[x].conn, authority);

	// update the credential
	ctx.body = await strategy.updateCredential(credential, data);
}



export async function del(ctx) {
	var credential = await Credential.get(ctx[x].conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]);
	await protect(ctx, ctx[x].authx.config.realm + ':credential.' + credential.authority_id + '.' +(ctx[x].user && ctx[x].user.id === credential.user_id ? 'me' : 'user') + ':delete');

	// fetch the authority
	var authority = await credential.authority();

	// get the strategy
	var Strategy = ctx[x].authx.strategies[authority.strategy];
	if (!Strategy)
		throw new Error('Strategy "' + authority.strategy + '" not implemented.');

	// instantiate the strategy
	var strategy = new Strategy(ctx[x].conn, authority);

	// delete the credential
	ctx.body = await strategy.deleteCredential(credential);
}
