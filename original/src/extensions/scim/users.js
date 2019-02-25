'use strict';

const Promise = require('bluebird');
const Filter = require('scim-query-filter-parser');
const json = require('../../util/json');
const { protect, can } = require('../../util/protect');
const errors = require('../../errors');
const User = require('../../models/User');
const Credential = require('../../models/Credential');
const x = require('../../namespace');
const e = require('./namespace');

module.exports.post = async function post(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':user:create');

	var scimData = await json(ctx.req);
	var profile = mapSCIMUserToProfile(scimData);
	if (!scimData.userName)
		throw new errors.ValidationError('A userName must be supplied.');

	// make sure a credential doesn't already exist
	try {
		await Credential.get(ctx[x].conn, [
			ctx[e].config.authorityId,
			scimData.userName
		]);
		throw new errors.ConflictError(
			'A user is already associated with this username.'
		);
	} catch (err) {
		if (!(err instanceof errors.NotFoundError)) throw err;
	}

	// create the user
	var userData = {
		type: 'human',
		profile: profile
	};

	if (typeof scimData.active === 'boolean')
		userData.status = scimData.active ? 'active' : 'disabled';

	var user = await User.create(ctx[x].conn, userData);

	// create the credential
	await Credential.create(ctx[x].conn, {
		id: [ctx[e].config.authorityId, scimData.userName],
		user_id: user.id,
		details: { entitlements: scimData.entitlements },
		profile: profile
	});

	ctx.status = 201;
	ctx.body = await mapAuthXUserToSCIMUser(user, ctx);
};

module.exports.query = async function query(ctx) {
	if (!(await can(ctx, ctx[x].authx.config.realm + ':user:read')))
		throw new errors.ForbiddenError(
			`You lack permission for the required scope "${
				ctx[x].authx.config.realm
			}:user:read".`
		);

	// parse the filter parameter
	var filter;
	if (ctx.query.filter)
		try {
			filter = new Filter(ctx.query.filter);
		} catch (err) {
			throw new errors.ValidationError(
				'Invalid `filter` parameter: ' + err.message
			);
		}

	// get all users
	var users = await User.query(ctx[x].conn);

	// map to SCIM format
	users = await Promise.all(
		users.map(user => mapAuthXUserToSCIMUser(user, ctx))
	);

	// apply SCIM filters
	if (filter) users = users.filter(filter.test);

	// TODO: support SCIM sorting

	// TODO: support SCIM pagination
	const limit = parseInt(ctx.query.count, 10) || 100;
	const skip = (parseInt(ctx.query.startIndex) || 1) - 1;
	const total = users.length;
	users = users.slice(skip, limit);

	ctx.body = {
		totalResults: total,
		itemsPerPage: limit,
		startIndex: skip + 1,
		schemas: [
			'urn:scim:schemas:core:1.0',
			'urn:scim:schemas:extension:enterprise:1.0'
		],
		Resources: users
	};
};

module.exports.get = async function get(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':user:read');
	var user = await User.get(ctx[x].conn, ctx.params.user_id);
	ctx.body = await mapAuthXUserToSCIMUser(user, ctx);
};

module.exports.patch = async function patch() {
	throw new errors.NotImplementedError();
};

module.exports.put = async function put(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':user:update');

	var scimData = await json(ctx.req);
	var profile = mapSCIMUserToProfile(scimData);
	if (!scimData.userName)
		throw new errors.ValidationError('A userName must be supplied.');

	// update the user
	var userData = {
		profile: profile
	};

	if (typeof scimData.active === 'boolean')
		userData.status = scimData.active ? 'active' : 'disabled';

	var user = await User.update(ctx[x].conn, ctx.params.user_id, userData);

	// update the credential
	await Credential.save(
		ctx[x].conn,
		[ctx[e].config.authorityId, scimData.userName],
		{
			details: { entitlements: scimData.entitlements },
			profile: profile,
			user_id: user.id
		}
	);

	ctx.body = await mapAuthXUserToSCIMUser(user, ctx);
};

module.exports.del = async function del() {
	throw new errors.NotImplementedError();
};

async function mapAuthXUserToSCIMUser(user, ctx) {
	const authorityId = ctx[e].config.authorityId;
	const data = {
		schemas: [
			'urn:scim:schemas:core:1.0',
			'urn:scim:schemas:extension:enterprise:1.0'
		],
		id: user.id,
		externalId: null,
		userName: null,
		active: user.status === 'active',
		groups: [],
		meta: {
			created: user.created,
			lastModified: user.last_updated
		}
	};

	const credential =
		(await user.credentials()).filter(
			credential => credential.authority_id === authorityId
		)[0] || null;
	if (credential) {
		data.externalId = credential.id[1];
		data.userName = credential.id[1];
		data.name = credential.profile.name;
		data.displayName = credential.profile.displayName;
		data.entitlements = credential.details.entitlements;
	}

	const roles = await Promise.filter(user.roles(), r =>
		can(ctx, ctx[x].authx.config.realm + ':role.' + r.id + ':read')
	);
	data.groups = roles.map(r => ({
		value: r.id,
		display: r.name
	}));

	return data;
}

function mapSCIMUserToProfile(data) {
	const profile = {
		displayName: ''
	};

	if (data.displayName) profile.displayName = data.displayName;

	if (data.name) {
		profile.name = {};

		if (data.name.givenName) profile.name.givenName = data.name.givenName;

		if (data.name.formatted) profile.name.formatted = data.name.formatted;

		if (data.name.familyName) profile.name.familyName = data.name.familyName;
	}

	return profile;
}
