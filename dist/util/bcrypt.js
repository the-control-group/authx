'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.compare = exports.hash = exports.genSalt = undefined;

var _bcrypt = require('bcrypt');

var _bcrypt2 = _interopRequireDefault(_bcrypt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var genSalt = exports.genSalt = function _callee(a) {
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				return _context.abrupt('return', new Promise(function (resolve, reject) {
					return _bcrypt2.default.genSalt(a, function (err, res) {
						if (err) return reject(err);
						return resolve(res);
					});
				}));

			case 1:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};

var hash = exports.hash = function _callee2(plain, rounds) {
	return regeneratorRuntime.async(function _callee2$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				return _context2.abrupt('return', new Promise(function (resolve, reject) {
					return _bcrypt2.default.hash(plain, rounds, function (err, res) {
						if (err) return reject(err);
						return resolve(res);
					});
				}));

			case 1:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
};

var compare = exports.compare = function _callee3(a, b) {
	return regeneratorRuntime.async(function _callee3$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				return _context3.abrupt('return', new Promise(function (resolve, reject) {
					return _bcrypt2.default.compare(a, b, function (err, res) {
						if (err) return reject(err);
						return resolve(res);
					});
				}));

			case 1:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
};