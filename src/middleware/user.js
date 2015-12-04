import jwt from 'jsonwebtoken';
import errors from '../errors';
import User from '../models/User';

export default async (ctx, next) => {

	let token;

	// parse the session cookie for a token
	let cookie = ctx.cookies.get('session');
	if (cookie) ctx.app.config.session_token.public.some(pub => {
		try {
			return token = ctx.session = jwt.verify(cookie, pub.key, {
				algorithms: [pub.algorithm],
				issuer: ctx.app.config.realm
			});
		} catch (err) { return; }
	});



	// use the bearer token if present
	if (!token)
		token = ctx.bearer || null;



	// get the user
	if (token && token.sub)
		ctx.user = await User.get(ctx.conn, token.sub);



	// make sure the user is active
	if (ctx.user && ctx.user.status !== 'active')
		throw new errors.ForbiddenError('Your user account has been disabled.');



	return next();
};
