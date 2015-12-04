'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.parseIncludes = parseIncludes;
exports.parseRoles = parseRoles;

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function parseIncludes(includable, ctx) {
	if (!ctx.query.include) return null;

	// parse the query parameters
	var includes;
	try {
		includes = JSON.parse(ctx.query.include);
	} catch (err) {
		throw new errors.ValidationError('The `include` query parameter was not valid json.');
	}

	if (!Array.isArray(includes)) throw new errors.ValidationError('The json-encoded `include` query parameter was not an array.');

	includes.forEach(function (i) {
		if (typeof i !== 'string') throw new errors.ValidationError('The json-encoded `include` query parameter included a non-string value in its array.');

		if (includable.indexOf(i) === -1) throw new errors.ValidationError('The `include` query parameter contained the invalid value, "' + i + '".');
	});

	return includes;
}

function parseRoles(ctx) {
	if (!ctx.query.role_ids) return null;

	// parse the query parameters
	var role_ids;
	try {
		role_ids = JSON.parse(ctx.query.role_ids);
	} catch (err) {
		throw new errors.ValidationError('The `role_ids` query parameter was not valid json.');
	}

	if (!Array.isArray(role_ids)) throw new errors.ValidationError('The json-encoded `role_ids` query parameter was not an array.');

	role_ids.forEach(function (i) {
		if (typeof i !== 'string') throw new errors.ValidationError('The json-encoded `role_ids` query parameter included a non-string value in its array.');
	});

	return role_ids;
}