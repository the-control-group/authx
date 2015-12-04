'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

exports.default = function _callee(ctx, next) {
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.prev = 0;
				_context.next = 3;
				return regeneratorRuntime.awrap(next());

			case 3:
				_context.next = 10;
				break;

			case 5:
				_context.prev = 5;
				_context.t0 = _context['catch'](0);

				ctx.status = _context.t0.status || 500;

				// display an error
				if (typeof _context.t0.expose === 'function') ctx.body = _context.t0.expose();else ctx.body = { message: _context.t0.expose ? _context.t0.message : 'An unknown error has occurred' };

				ctx.app.emit('error', _context.t0, ctx);

			case 10:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[0, 5]]);
};