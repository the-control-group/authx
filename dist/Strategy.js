'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _Credential = require('./models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class EmailStarategy {
	constructor(conn, authority) {
		this.conn = conn;
		this.authority = authority;
	}

	// Authenticate
	// ------------
	// The authenticate method is passed a Koa context, and is responsible for interfacing directly with the user. When a user has
	// successfully authenticated, it must return the corresponding User object, which the service will use to generate a token.
	//
	// If appropriate, the strategy may also attempt to resolve an unknown user based on other credentials (such as email), and even
	// create a new User if necessary. If a strategy does this, its mapping to other strategies/credentials must be configurable, as
	// to avoid tightly coupling them.

	authenticate() {
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					throw new Error('The authenticate method must be implemented in each strategy.');

				case 1:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					return _context2.abrupt('return', _Credential2.default.create(this.conn, data));

				case 1:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					_context3.next = 2;
					return regeneratorRuntime.awrap(authority.update(delta));

				case 2:
					return _context3.abrupt('return', _context3.sent);

				case 3:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	static deleteAuthority(authority) {
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(authority.delete());

				case 2:
					return _context4.abrupt('return', _context4.sent);

				case 3:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					return _context5.abrupt('return', _Credential2.default.create(this.conn, data));

				case 1:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:
					_context6.next = 2;
					return regeneratorRuntime.awrap(credential.update(delta));

				case 2:
					return _context6.abrupt('return', _context6.sent);

				case 3:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	deleteCredential(credential) {
		return regeneratorRuntime.async(function _callee7$(_context7) {
			while (1) switch (_context7.prev = _context7.next) {
				case 0:
					_context7.next = 2;
					return regeneratorRuntime.awrap(credential.delete());

				case 2:
					return _context7.abrupt('return', _context7.sent);

				case 3:
				case 'end':
					return _context7.stop();
			}
		}, null, this);
	}

}
exports.default = EmailStarategy;