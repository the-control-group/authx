import _ from 'lodash';
import Route from 'path-match';

var endpointRouter = Route({
	sensitive: true,
	strict: false,
	end: true
});

var baseRouter = Route({
	sensitive: true,
	strict: false,
	end: false
});

function makeRoute(router) {
	return (path, fn) => {
		var match = router(path);
		return (ctx, next) => {
			var params = match(ctx.request.path, ctx.params);

			// wrong path
			if (!params)
				return next();

			// save the params
			if(ctx.params)
				_.apply(ctx.params, params);
			else
				ctx.params = params;

			// call the function
			return fn(ctx, next);
		};
	};
}

function makeMethodRoute(router, method) {
	return (path, fn) => {
		var match = router(path);
		return (ctx, next) => {

			// wrong method
			if (ctx.method !== method)
				return next();

			var params = match(ctx.request.path, ctx.params);

			// wrong path
			if (!params)
				return next();

			// save the params
			if(ctx.params)
				_.apply(ctx.params, params);
			else
				ctx.params = params;

			// call the function
			return fn(ctx, next);
		};
	};
}

export var get   = makeMethodRoute(endpointRouter, 'GET');
export var put   = makeMethodRoute(endpointRouter, 'PUT');
export var post  = makeMethodRoute(endpointRouter, 'POST');
export var patch = makeMethodRoute(endpointRouter, 'PATCH');
export var del   = makeMethodRoute(endpointRouter, 'DELETE');
export var any   = makeRoute(endpointRouter);
export var use   = makeRoute(baseRouter);
