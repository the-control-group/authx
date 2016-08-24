'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _namespace = require('../namespace');

var _namespace2 = _interopRequireDefault(_namespace);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function _callee(ctx, next) {
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap(ctx[_namespace2.default].authx.pool.acquire());

			case 2:
				ctx[_namespace2.default].conn = _context.sent;
				_context.prev = 3;
				_context.next = 6;
				return regeneratorRuntime.awrap(next());

			case 6:
				_context.prev = 6;

				if (ctx[_namespace2.default].conn) ctx[_namespace2.default].conn.release();
				return _context.finish(6);

			case 9:
			case 'end':
				return _context.stop();
		}
	}, null, undefined, [[3,, 6, 9]]);
};