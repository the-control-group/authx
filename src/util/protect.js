const scopes = require('scopeutils');
const errors = require('../errors');
const x = require('../namespace');

async function can(ctx, scope, strict) {

	// ctx[x].bearer request on behalf of a user
	if (ctx[x].bearer) {
		if (
			ctx[x].bearer.type === 'access_token'
			&& ctx[x].bearer.scopes
			&& ctx[x].bearer.scopes.some(s => scopes.can(s, scope, strict))
		) return true;
	}


	// direct user request
	else if (ctx[x].user && await ctx[x].user.can(scope, strict)) {
		return true;
	}

	return false;
}

async function protect(ctx, scope, strict) {
	if (await can(ctx, scope, strict)) return;
	throw new errors.ForbiddenError('You lack permission for the required scope "' + scope + '".');
}

module.exports.can = can;
module.exports.protect = protect;
