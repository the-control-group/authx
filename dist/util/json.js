'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rawBody = require('raw-body');

var _rawBody2 = _interopRequireDefault(_rawBody);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function json(req) {
	var data;
	return regeneratorRuntime.async(function json$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.prev = 0;
				_context.next = 3;
				return regeneratorRuntime.awrap((0, _rawBody2.default)(req, { encoding: 'utf8' }));

			case 3:
				data = _context.sent;
				return _context.abrupt('return', JSON.parse(data));

			case 7:
				_context.prev = 7;
				_context.t0 = _context['catch'](0);
				throw new errors.ValidationError('The request body was invalid JSON.');

			case 10:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[0, 7]]);
};