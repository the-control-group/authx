import r from 'rethinkdb';

export default async (ctx, next) => {

	if (
		ctx.headers.origin
		&& ctx.headers.origin !== (ctx.request.protocol + '://' + ctx.request.host)
		&& 0 < await r.table('clients').getAll(ctx.headers.origin, {index: 'base_urls'}).limit(1).count().run(ctx.conn)
	) {
		ctx.set('Access-Control-Allow-Origin', ctx.headers.origin);
		ctx.set('Access-Control-Allow-Methods', 'OPTIONS, HEAD, GET, POST, PUT, PATCH, DELETE');
	}

	await next();

};
