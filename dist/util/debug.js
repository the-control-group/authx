'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
const noop = function () {};

exports.default = function (thisArg, ctx) {
	if (!ctx.app.config.debug) return noop;

	return function debug(message, data) {
		ctx.app.emit('debug', {
			class: this.constructor.name,
			timestamp: Date.now(),
			message: message,
			data: data
		});
	};
};