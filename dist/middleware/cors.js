'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function _callee(ctx, next) {
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.t0 = ctx.headers.origin && ctx.headers.origin !== ctx.request.protocol + '://' + ctx.request.host;

				if (!_context.t0) {
					_context.next = 6;
					break;
				}

				_context.next = 4;
				return regeneratorRuntime.awrap(_rethinkdb2.default.table('clients').getAll(ctx.headers.origin, { index: 'base_urls' }).limit(1).count().run(ctx.conn));

			case 4:
				_context.t1 = _context.sent;
				_context.t0 = 0 < _context.t1;

			case 6:
				if (!_context.t0) {
					_context.next = 9;
					break;
				}

				ctx.set('Access-Control-Allow-Origin', ctx.headers.origin);
				ctx.set('Access-Control-Allow-Methods', 'OPTIONS, HEAD, GET, POST, PUT, PATCH, DELETE');

			case 9:

				if (ctx.method === 'OPTIONS') ctx.status = 204;

				_context.next = 12;
				return regeneratorRuntime.awrap(next());

			case 12:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};