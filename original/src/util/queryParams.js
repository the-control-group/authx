const errors = require('../errors');

module.exports.parseIncludes = function parseIncludes(includable, ctx) {
	if (!ctx.query.include) return null;

	// parse the query parameters
	var includes;
	try {
		includes = JSON.parse(ctx.query.include);
	} catch (err) {
		throw new errors.ValidationError(
			'The `include` query parameter was not valid json.'
		);
	}

	if (!Array.isArray(includes))
		throw new errors.ValidationError(
			'The json-encoded `include` query parameter was not an array.'
		);

	includes.forEach(i => {
		if (typeof i !== 'string')
			throw new errors.ValidationError(
				'The json-encoded `include` query parameter included a non-string value in its array.'
			);

		if (includable.indexOf(i) === -1)
			throw new errors.ValidationError(
				'The `include` query parameter contained the invalid value, "' +
					i +
					'".'
			);
	});

	return includes;
};

module.exports.parseRoles = function parseRoles(ctx) {
	if (!ctx.query.role_ids) return null;

	// parse the query parameters
	var role_ids;
	try {
		role_ids = JSON.parse(ctx.query.role_ids);
	} catch (err) {
		throw new errors.ValidationError(
			'The `role_ids` query parameter was not valid json.'
		);
	}

	if (!Array.isArray(role_ids))
		throw new errors.ValidationError(
			'The json-encoded `role_ids` query parameter was not an array.'
		);

	role_ids.forEach(i => {
		if (typeof i !== 'string')
			throw new errors.ValidationError(
				'The json-encoded `role_ids` query parameter included a non-string value in its array.'
			);
	});

	return role_ids;
};
