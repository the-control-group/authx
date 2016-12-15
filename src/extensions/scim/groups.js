const Promise = require('bluebird');
const Filter = require('scim-query-filter-parser');
const json = require('../../util/json');
const { protect, can } = require('../../util/protect');
const errors = require('../../errors');
const Role = require('../../models/Role');
const x = require('../../namespace');

module.exports.post = async function post() {
	throw new errors.NotImplementedError();
};

module.exports.query = async function query(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.*:read', false);


	// parse the filter parameter
	var filter;
	if (ctx.query.filter) try {
		filter = new Filter(ctx.query.filter);
	} catch (err) {
		throw new errors.ValidationError('Invalid `filter` parameter: ' + err.message);
	}


	// get all roles
	var roles = await Role.query(ctx[x].conn);


	// filter out those that are not viewable to this token
	roles = await Promise.filter(roles, r => can(ctx, ctx[x].authx.config.realm + ':role.' + r.id + ':read'));


	// map to SCIM format
	roles = await Promise.all(roles.map(mapAuthXRoleToSCIMGroup));


	// apply SCIM filters
	if (filter)
		roles = roles.filter(filter.test);


	// TODO: support SCIM sorting


	// support SCIM pagination
	const limit = parseInt(ctx.query.count, 10) || 100;
	const skip = (parseInt(ctx.query.startIndex) || 1) - 1;
	const total = roles.length;
	roles = roles.slice(skip, limit);

	ctx.body = {
		totalResults: total,
		itemsPerPage: limit,
		startIndex: skip + 1,
		schemas: [
			'urn:scim:schemas:core:1.0'
		],
		Resources: roles
	};
};

module.exports.get = async function get(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':read');
	const role = await Role.get(ctx[x].conn, ctx.params.role_id);
	ctx.body = await mapAuthXRoleToSCIMGroup(role);
};

module.exports.patch = async function patch(ctx) {
	await protect(ctx, ctx[x].authx.config.realm + ':role.' + ctx.params.role_id + ':update');
	var data = await json(ctx.req);
	console.log(data);
	
	var assignments = {};
	data.members.forEach((patch) => {
		assignments[patch.value] = patch.operation === 'add';
	});

	await Role.update(ctx[x].conn, ctx.params.role_id, {assignments: assignments});
	ctx.status = 204;
};

module.exports.put = async function put() {
	throw new errors.NotImplementedError();
};

module.exports.del = async function del() {
	throw new errors.NotImplementedError();
};

async function mapAuthXRoleToSCIMGroup (role) {
	return {
		schemas: ['urn:scim:schemas:core:1.0'],
		id: role.id,
		externalId: null, // TODO: what should we do here?
		displayName: role.name,
		members: (await role.users()).map((user) => ({
			value: user.id,
			display: user.profile.displayName
		})),
		meta: {
			created: role.created,
			lastModified: role.last_updated
		},
	};
}
