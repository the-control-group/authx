import * as scopes from './scopes';
import * as errors from '../errors';

export async function can(ctx, scope, strict) {

	// bearer request on behalf of a user
	if (ctx.bearer) {
		if (
			ctx.bearer.type === 'access_token'
			&& ctx.bearer.scopes
			&& ctx.bearer.scopes.some(s => scopes.can(s, scope, strict))
		) return true;
	}


	// direct user request
	else if (ctx.user && await ctx.user.can(scope, strict)) {
		return true;
	}

	return false;
}

export async function protect(ctx, scope, strict) {
	if (await can(ctx, scope, strict)) return;
	throw new errors.ForbiddenError('You lack permission for the required scope "' + scope + '".');
}
