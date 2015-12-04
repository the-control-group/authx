import Promise from 'bluebird';
import r from 'rethinkdb';
import json from '../util/json';
import {protect, can} from '../util/protect';
import {parseIncludes, parseRoles} from '../util/queryParams';
import * as errors from '../errors';
import Role from '../models/Role';
import User from '../models/User';

let includable = ['credentials', 'grants', 'roles', 'scopes', 'team'];

export async function post(ctx) {
	await protect(ctx, 'AuthX:user:create');
	var includes = parseIncludes(includable, ctx);
	var data = await json(ctx.req);
	var user = await User.create(ctx.conn, data);
	ctx.body = await include(user, includes, ctx);
	ctx.status = 201;
}

export async function query(ctx) {
	if (!await can(ctx, 'AuthX:me:read') && !await can(ctx, 'AuthX:user:read'))
		throw new errors.ForbiddenError('You lack permission for the required scope "AuthX:user:read".');


	var ids;

	// restrict to the current user
	if (!await can(ctx, 'AuthX:user:read'))
		ids = [ctx.user.id];


	// restrict to provided roles
	else if (ctx.query.roles) {
		let role_ids = parseRoles(ctx);

		// make sure we have permission to access these roles
		await Promise.map(role_ids, id => protect(ctx, 'AuthX:role.' + id + ':read'));

		// fetch the roles from the database
		let roles = await Role.query(ctx.conn, x => x.getAll(r.args(role_ids), {index: 'id'}));

		// combine assignments
		let assignments = {};
		roles.forEach(role => {
			Object.keys(role.assignments).forEach(a => {
				if (role.assignments[a]) assignments[a] = true;
			});
		});

		// get user IDs
		ids = Object.keys(assignments);
	}


	var transformer = x => {
		var index;

		// restrict to known ids

		if (ids) {
			x = x.getAll(r.args(ids), {index: 'id'});
			index = 'id';
		}


		// order
		if (!index || index === 'created') {
			x = x.orderBy({index: 'created'});
			index = 'created';
		} else
			x = x.orderBy('created');


		// filter by status
		if (ctx.query.status)
			if (!index || index === 'status') {
				x = x.getAll(ctx.query.status, {index: 'status'});
				index = 'status';
			} else
				x = x.filter({status: ctx.query.status});


		// fuzzy search by name
		var search = ctx.query.search ? ctx.query.search.toLowerCase() : null;
		if (ctx.query.search)
			x = x.filter(row => r.or(
				row('profile')('displayName').downcase().match(search),
				row('profile')('nickname').default('').downcase().match(search),
				row('profile')('name')('familyName').default('').downcase().match(search),
				row('profile')('name')('givenName').default('').downcase().match(search),
				row('profile')('name')('middleName').default('').downcase().match(search)
			));


		// skip
		var skip = parseInt(ctx.query.skip);
		if (skip) x = x.skip(skip);


		// limit
		var limit = parseInt(ctx.query.limit);
		if (limit) x = x.limit(limit);

		return x;
	};


	var includes = parseIncludes(includable, ctx);
	var users = await User.query(ctx.conn, transformer);
	ctx.body = await Promise.all(users.map(async u => await include(u, includes, ctx)));
}

export async function get(ctx) {
	let user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
	await protect(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':read');
	var includes = parseIncludes(includable, ctx);
	var user = await User.get(ctx.conn, user_id);
	ctx.body = await include(user, includes, ctx);
}

export async function patch(ctx) {
	let user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
	await protect(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':update');
	var includes = parseIncludes(includable, ctx);
	var data = await json(ctx.req);
	var user = await User.update(ctx.conn, user_id, data);
	ctx.body = await include(user, includes, ctx);
}

export async function del(ctx) {
	let user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
	await protect(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':delete');
	var includes = parseIncludes(includable, ctx);

	// make sure to include credentials, which are automatically deleted with the user
	includes = includes || [];
	if (includes.indexOf('credentials') === -1)
		includes.push('credentials');

	var user = await User.delete(ctx.conn, user_id);
	ctx.body = await include(user, includes, ctx);
}

async function include(user, includes, ctx) {

	if (!includes || !includes.length)
		return user;


	// call the included functions in parallel
	var results = await Promise.map(includes, async i => {

		// get the results
		var result = await user[i]();


		// filter out unauthorized credentials
		if (i === 'credentials')
			result = await Promise.filter(result, c => can(ctx, 'AuthX:credential.' + c.authority_id + '.' + (ctx.user && ctx.user.id === user.id ? 'me' : 'user') + ':read'));


		// filter out unauthorized grants
		if (i === 'grants')
			result = await Promise.filter(result, g => can(ctx, 'AuthX:grant.' + g.client_id + '.' + (ctx.user && ctx.user.id === user.id ? 'me' : 'user') + ':read'));


		// filter out unauthorized roles
		if (i === 'roles')
			result = await Promise.filter(result, r => can(ctx, 'AuthX:role.' + r.id + ':read'));


		return result;
	});

	// assign the results to a new object
	var included = Object.assign(Object.create(User.prototype), user);
	results.forEach((v, i) => included[includes[i]] = v);

	// return the user with includes
	return included;
}
