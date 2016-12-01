module.exports = async (ctx, next) => {
	try {
		await next();
	} catch (err) {
		ctx.status = err.status || 500;

		// display an error
		if(typeof err.expose === 'function')
			ctx.body = err.expose();
		else
			ctx.body = {message: err.expose ? err.message : 'An unknown error has occurred.' };

		ctx.app.emit('error', err, ctx);
	}
};
