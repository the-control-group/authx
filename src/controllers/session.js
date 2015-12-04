import qs from 'querystring';
import jwt from 'jsonwebtoken';
import Authority from '../models/Authority';

export default async (ctx, next) => {
	ctx.status = 204;

	try {

		// get the authority
		var authority = await Authority.get(ctx.conn, ctx.params.authority_id);

		// get the strategy
		var Strategy = ctx.app.strategies[authority.strategy];
		if (!Strategy)
			throw new Error('Strategy "' + authority.strategy + '" not implemented.');

		// instantiate the strategy
		var strategy = new Strategy(ctx.conn, authority);

		// pass the request to the strategy
		var user = await strategy.authenticate(ctx, next);


		if (user && user.status === 'active') {

			// generate token from user
			let token = jwt.sign({}, ctx.app.config.session_token.private_key, {
				algorithm: ctx.app.config.session_token.algorithm,
				expiresIn: ctx.app.config.session_token.expiresIn,
				audience: ctx.app.config.realm,
				subject: user.id,
				issuer: ctx.app.config.realm
			});

			// set the session cookie
			ctx.cookies.set('session', token);

			ctx.status = 200;
			ctx.body = {message: 'You have successfully logged in.'};
		}

		respond();

	} catch (err) {
		ctx.app.emit('error', err, ctx);

		// set the status
		ctx.status = err.status || 500;

		// display an error
		if(typeof err.expose === 'function')
			ctx.body = err.expose();
		else
			ctx.body = {message: err.expose ? err.message : 'An unknown error has occurred' };

		respond();
	}


	// This allows responses to be returned directly, or forwarded via an HTTP redirect. Because
	// the redirect URL can be specified insecurely, it's absolutely required that the response
	// body contains NO sensitive information.

	function respond() {
		if(ctx.redirect_to && (ctx.status < 300 || ctx.status >= 400)) {
			let body = ctx.body;
			let query = qs.stringify({
				status: ctx.status,
				body: JSON.stringify(body)
			});
			ctx.redirect(ctx.redirect_to + (ctx.redirect_to.includes('?') ? '&' : '?') + query);
			ctx.body = body;
		}
	}

};