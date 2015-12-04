"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

exports.default = function _callee(ctx, next) {
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap(ctx.app.pool.acquire());

			case 2:
				ctx.conn = _context.sent;
				_context.prev = 3;
				_context.next = 6;
				return regeneratorRuntime.awrap(next());

			case 6:
				_context.prev = 6;

				ctx.conn.release();
				return _context.finish(6);

			case 9:
			case "end":
				return _context.stop();
		}
	}, null, this, [[3,, 6, 9]]);
};