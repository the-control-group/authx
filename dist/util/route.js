'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.use = exports.any = exports.del = exports.patch = exports.post = exports.put = exports.get = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _pathMatch = require('path-match');

var _pathMatch2 = _interopRequireDefault(_pathMatch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var endpointRouter = (0, _pathMatch2.default)({
	sensitive: true,
	strict: false,
	end: true
});

var baseRouter = (0, _pathMatch2.default)({
	sensitive: true,
	strict: false,
	end: false
});

function makeRoute(router) {
	return function (path, fn) {
		var match = router(path);
		return function (ctx, next) {
			var params = match(ctx.request.path, ctx.params);

			// wrong path
			if (!params) return next();

			// save the params
			if (ctx.params) _lodash2.default.apply(ctx.params, params);else ctx.params = params;

			// call the function
			return fn(ctx, next);
		};
	};
}

function makeMethodRoute(router, method) {
	return function (path, fn) {
		var match = router(path);
		return function (ctx, next) {

			// wrong method
			if (ctx.method !== method) return next();

			var params = match(ctx.request.path, ctx.params);

			// wrong path
			if (!params) return next();

			// save the params
			if (ctx.params) _lodash2.default.apply(ctx.params, params);else ctx.params = params;

			// call the function
			return fn(ctx, next);
		};
	};
}

var get = exports.get = makeMethodRoute(endpointRouter, 'GET');
var put = exports.put = makeMethodRoute(endpointRouter, 'PUT');
var post = exports.post = makeMethodRoute(endpointRouter, 'POST');
var patch = exports.patch = makeMethodRoute(endpointRouter, 'PATCH');
var del = exports.del = makeMethodRoute(endpointRouter, 'DELETE');
var any = exports.any = makeRoute(endpointRouter);
var use = exports.use = makeRoute(baseRouter);