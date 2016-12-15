const jwt = require('jsonwebtoken');
const errors = require('../errors');
const x = require('../namespace');

let parser = /^Bearer\s+([^\s]+)\s*$/;

module.exports = async (ctx, next) => {
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
	})) throw new errors.AuthenticationError('The supplied bearer token is invalid.');

	return next();
};
