import jwt from 'jsonwebtoken';
import * as errors from '../errors';
import x from '../namespace';

let parser = /^Bearer\s+([^\s]+)\s*$/;

export default async (ctx, next) => {
	ctx[x].bearer = null;

	// parse the authorization header
	let parsed = ctx.headers.authorization ? ctx.headers.authorization.match(parser) : null;

	// verify the JWT against all public keys
	if (parsed && parsed [1] && !ctx[x].authx.config.access_token.public.some(pub => {
		try {
			return ctx[x].bearer = jwt.verify(parsed[1], pub.key, {
				algorithms: [pub.algorithm],
				issuer: ctx[x].authx.config.realm
			});
		} catch (err) { return; }
	})) throw errors.AuthenticationError('The supplied bearer token is invalid.');

	return next();
};
