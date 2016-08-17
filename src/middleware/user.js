import jwt from 'jsonwebtoken';
import errors from '../errors';
import User from '../models/User';
import x from '../namespace';

export default async (ctx, next) => {
	let token;


	// parse the session cookie for a token
	let cookie = ctx.cookies.get('session');
	if (cookie) ctx[x].authx.config.session_token.public.some(pub => {
		try {
			return token = ctx[x].session = jwt.verify(cookie, pub.key, {
				algorithms: [pub.algorithm],
				issuer: ctx[x].authx.config.realm
			});
		} catch (err) { return; }
	});


	// use the bearer token if present
	if (!token)
		token = ctx[x].bearer || null;


	// get the user
	if (token && token.sub)
		ctx[x].user = await User.get(ctx[x].conn, token.sub);


	// make sure the user is active
	if (ctx[x].user && ctx[x].user.status !== 'active')
		throw new errors.ForbiddenError('Your user account has been disabled.');


	return next();
};
