export default async (ctx, next) => {
	ctx.conn = await ctx.app.pool.acquire();
	try {
		await next();
	} finally {
		ctx.conn.release();
	}
};
