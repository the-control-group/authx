import x from '../namespace';

export default async (ctx, next) => {
	ctx[x].conn = await ctx[x].authx.pool.acquire();
	try {
		await next();
	} finally {
		if (ctx[x].conn) ctx[x].conn.release();
	}
};
