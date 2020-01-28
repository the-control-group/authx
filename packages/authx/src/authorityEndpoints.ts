import { Context as KoaContext, Next as KoaNext } from "koa";
import { Authority } from "./model";
import { Context } from "./Context";
import x from "./x";

export async function authorityEndpoints(
  ctx: KoaContext & { [x]: Context },
  next: KoaNext
): Promise<void> {
  const authorityId = ctx.params?.id;
  if (!authorityId) {
    return next();
  }

  if (typeof authorityId !== "string") {
    throw new Error("The URL parameter authorityId must be a string.");
  }

  const { pool, strategies } = ctx[x];
  const tx = await pool.connect();
  try {
    // Get the authority.
    const authority = await Authority.read(
      tx,
      authorityId,
      strategies.authorityMap
    );

    // If the authority is not enabled, treat it as if it didn't exist.
    if (!authority.enabled) {
      return next();
    }

    // Get the strategy middleware.
    let middleware;
    for (const strategy of Object.keys(strategies.authorityMap)) {
      if (authority instanceof strategies.authorityMap[strategy]) {
        middleware = strategies.middlewareMap[strategy];
        break;
      }
    }

    // If the strategy has a middleware, call it!
    if (middleware) {
      await middleware(ctx, next);
    }
  } finally {
    tx.release();
  }
}
