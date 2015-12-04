'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('./errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const CONN = Symbol('conn');

class Model {

	// Static Methods
	// --------------

	static get table() {
		throw new Error('A Model must define a static getter `table`.');
	}

	static parseRethinkError(message) {

		// duplicate key
		if (message && message.indexOf('Duplicate primary key') === 0) return new errors.ConflictError('A record with the same id already exists.');

		// other error
		return new Error(message);
	}

	// get a record by its primary ID
	static query(conn, transform) {
		var _this = this;

		var result;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					if (!transform) transform = function (q) {
						return q;
					};

					_context.next = 3;
					return regeneratorRuntime.awrap(transform(_rethinkdb2.default.table(this.table)).run(conn));

				case 3:
					result = _context.sent;
					_context.next = 6;
					return regeneratorRuntime.awrap(result.toArray());

				case 6:
					result = _context.sent;
					return _context.abrupt('return', result.map(function (record) {
						return new _this(conn, record);
					}));

				case 8:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	// get a record by its primary ID
	static get(conn, id) {
		var result;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					_context2.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).run(conn));

				case 2:
					result = _context2.sent;

					if (result) {
						_context2.next = 5;
						break;
					}

					throw new errors.NotFoundError();

				case 5:
					return _context2.abrupt('return', new this(conn, result));

				case 6:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	// update a record by its primary ID
	static update(conn, id, data) {
		var result;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					_context3.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).update(data, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context3.sent;

					if (!(result.errors > 0)) {
						_context3.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (!(!result.replaced && !result.unchanged)) {
						_context3.next = 7;
						break;
					}

					throw new errors.NotFoundError();

				case 7:
					return _context3.abrupt('return', new this(conn, result.changes[0].new_val));

				case 8:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// save a record by its primary ID
	static save(conn, id, data) {
		var result;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).replace(data, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context4.sent;

					if (!(result.errors > 0)) {
						_context4.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					return _context4.abrupt('return', new this(conn, result.changes[0].new_val));

				case 6:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	// delete a record by its primary ID
	static delete(conn, id) {
		var result;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					_context5.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).delete({ returnChanges: 'always' }).run(conn));

				case 2:
					result = _context5.sent;

					if (!(result.errors > 0)) {
						_context5.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (result.deleted) {
						_context5.next = 7;
						break;
					}

					throw new errors.NotFoundError();

				case 7:
					return _context5.abrupt('return', new this(conn, result.changes[0].old_val));

				case 8:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	// create a new record
	static create(conn, data) {
		var result;
		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:
					_context6.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).insert(data, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context6.sent;

					if (!(result.errors > 0)) {
						_context6.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (result.inserted) {
						_context6.next = 7;
						break;
					}

					throw new errors.NotFoundError();

				case 7:
					return _context6.abrupt('return', new this(conn, result.changes[0].new_val));

				case 8:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	// Constructor
	// -----------

	constructor(conn, data) {

		// assign data
		_lodash2.default.assign(this, data);

		// assign the connection
		this[Model.Symbols.CONN] = conn;
	}

	// Methods
	// -------

	// update this model instance
	update(data) {
		return regeneratorRuntime.async(function _callee7$(_context7) {
			while (1) switch (_context7.prev = _context7.next) {
				case 0:
					_context7.next = 2;
					return regeneratorRuntime.awrap(this.constructor.update(this[Model.Symbols.CONN], this.id, data));

				case 2:
					return _context7.abrupt('return', _context7.sent);

				case 3:
				case 'end':
					return _context7.stop();
			}
		}, null, this);
	}

	// delete this model instance{}
	delete() {
		return regeneratorRuntime.async(function _callee8$(_context8) {
			while (1) switch (_context8.prev = _context8.next) {
				case 0:
					_context8.next = 2;
					return regeneratorRuntime.awrap(this.constructor.delete(this[Model.Symbols.CONN], this.id));

				case 2:
					return _context8.abrupt('return', _context8.sent);

				case 3:
				case 'end':
					return _context8.stop();
			}
		}, null, this);
	}

}

exports.default = Model;
Model.Symbols = {
	CONN: CONN
};
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
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
class ValidationError extends Error {
	constructor(message, validation, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.message = message || 'The data is not valid.';
		this.validation = validation || {};
		this.status = this.statusCode = 400;
	}

	expose() {
		return {
			message: this.message,
			validation: this.validation
		};
	}
}

exports.ValidationError = ValidationError;
class NotFoundError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'The resource does not exist.';
		this.status = this.statusCode = 404;
	}
}

exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'A duplicate resource already exists.';
		this.status = this.statusCode = 409;
	}
}

exports.ConflictError = ConflictError;
class AuthenticationError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'Authentication failed.';
		this.status = this.statusCode = 401;
	}
}

exports.AuthenticationError = AuthenticationError;
class ForbiddenError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'The action is forbidden.';
		this.status = this.statusCode = 403;
	}
}
exports.ForbiddenError = ForbiddenError;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _errors = require('./errors');

var errors = _interopRequireWildcard(_errors);

var _route = require('./util/route');

var route = _interopRequireWildcard(_route);

var _scopes = require('./util/scopes');

var scopes = _interopRequireWildcard(_scopes);

var _koa = require('koa');

var _koa2 = _interopRequireDefault(_koa);

var _mailer = require('./util/mailer');

var _mailer2 = _interopRequireDefault(_mailer);

var _pool = require('./util/pool');

var _pool2 = _interopRequireDefault(_pool);

var _protect = require('./util/protect');

var _email = require('./strategies/email');

var _email2 = _interopRequireDefault(_email);

var _google = require('./strategies/google');

var _google2 = _interopRequireDefault(_google);

var _password = require('./strategies/password');

var _password2 = _interopRequireDefault(_password);

var _bearer = require('./middleware/bearer');

var _bearer2 = _interopRequireDefault(_bearer);

var _cors = require('./middleware/cors');

var _cors2 = _interopRequireDefault(_cors);

var _db = require('./middleware/db');

var _db2 = _interopRequireDefault(_db);

var _error = require('./middleware/error');

var _error2 = _interopRequireDefault(_error);

var _user = require('./middleware/user');

var _user2 = _interopRequireDefault(_user);

var _authorities = require('./controllers/authorities');

var authorityController = _interopRequireWildcard(_authorities);

var _clients = require('./controllers/clients');

var clientController = _interopRequireWildcard(_clients);

var _credentials = require('./controllers/credentials');

var credentialController = _interopRequireWildcard(_credentials);

var _grants = require('./controllers/grants');

var grantController = _interopRequireWildcard(_grants);

var _roles = require('./controllers/roles');

var roleController = _interopRequireWildcard(_roles);

var _teams = require('./controllers/teams');

var teamController = _interopRequireWildcard(_teams);

var _users = require('./controllers/users');

var userController = _interopRequireWildcard(_users);

var _session = require('./controllers/session');

var _session2 = _interopRequireDefault(_session);

var _tokens = require('./controllers/tokens');

var _tokens2 = _interopRequireDefault(_tokens);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// middleware
class AuthX extends _koa2.default {

	constructor(config, strategies) {
		super();

		// set the config
		this.config = config;
		this.keys = this.config.keys;
		this.proxy = this.config.proxy;

		this.pool = new _pool2.default(this.config.db, this.config.db.pool.max, this.config.db.pool.min, this.config.db.pool.timeout);
		this.mail = (0, _mailer2.default)(this.config.mailer);
		this.strategies = strategies || {
			email: _email2.default,
			password: _password2.default,
			google: _google2.default
		};

		var root = this.config.root || '/';

		// Generic Middleware
		// ------------------

		// error handling
		this.use(_error2.default);

		// get a database connection
		this.use(_db2.default);

		// add CORS header if necessary
		this.use(_cors2.default);

		// get the current bearer token
		this.use(_bearer2.default);

		// get the current user
		this.use(_user2.default);

		// Session
		// =======
		// These endpoints manage the user's active session, including logging in,
		// logging out, and associating credentials.

		this.use(route.use(root + 'session/:authority_id', _session2.default));
		this.use(route.del(root + 'session'), function _callee(ctx) {
			return regeneratorRuntime.async(function _callee$(_context) {
				while (1) switch (_context.prev = _context.next) {
					case 0:
						ctx.cookies.set('session');
						ctx.status = 204;

					case 2:
					case 'end':
						return _context.stop();
				}
			}, null, this);
		});

		// Tokens
		// ======
		// These endpoints are used by clients wishing to authenticate/authorize
		// a user with AuthX. They implement the OAuth 2.0 flow for "authorization
		// code" grant types.

		this.use(route.use(root + 'tokens', _tokens2.default));

		// Can
		// ===
		// This is a convenience endpoint for clients. It validates credentials and
		// asserts that the token can access to the provided scope.

		this.use(route.get(root + 'can/:scope', function _callee2(ctx) {
			return regeneratorRuntime.async(function _callee2$(_context2) {
				while (1) switch (_context2.prev = _context2.next) {
					case 0:
						if (!(!ctx.params.scope || !scopes.validate(ctx.params.scope))) {
							_context2.next = 2;
							break;
						}

						throw new errors.ValidationError();

					case 2:
						if (ctx.user) {
							_context2.next = 4;
							break;
						}

						throw new errors.AuthenticationError();

					case 4:
						_context2.next = 6;
						return regeneratorRuntime.awrap((0, _protect.can)(ctx, ctx.params.scope, ctx.query.strict !== 'false'));

					case 6:
						if (_context2.sent) {
							_context2.next = 8;
							break;
						}

						throw new errors.ForbiddenError();

					case 8:

						ctx.status = 204;

					case 9:
					case 'end':
						return _context2.stop();
				}
			}, null, this);
		}));

		// Keys
		// ====
		// This outputs valid public keys and algorithms that can be used to verify
		// access tokens by resource servers. The first key is always the most recent.

		this.use(route.use(root + 'keys', function _callee3(ctx) {
			return regeneratorRuntime.async(function _callee3$(_context3) {
				while (1) switch (_context3.prev = _context3.next) {
					case 0:
						ctx.body = ctx.app.config.access_token.public;

					case 1:
					case 'end':
						return _context3.stop();
				}
			}, null, this);
		}));

		// Resources
		// =========

		// Authorities
		// -----------

		this.use(route.post(root + 'authorities', authorityController.post));
		this.use(route.get(root + 'authorities', authorityController.query));
		this.use(route.get(root + 'authorities/:authority_id', authorityController.get));
		this.use(route.patch(root + 'authorities/:authority_id', authorityController.patch));
		this.use(route.del(root + 'authorities/:authority_id', authorityController.del));

		// Clients
		// -------

		this.use(route.post(root + 'clients', clientController.post));
		this.use(route.get(root + 'clients', clientController.query));
		this.use(route.get(root + 'clients/:client_id', clientController.get));
		this.use(route.patch(root + 'clients/:client_id', clientController.patch));
		this.use(route.del(root + 'clients/:client_id', clientController.del));

		// Credentials
		// ------------

		this.use(route.post(root + 'credentials', credentialController.post));
		this.use(route.get(root + 'credentials', credentialController.query));
		this.use(route.get(root + 'credentials/:credential_id_0/:credential_id_1', credentialController.get));
		this.use(route.patch(root + 'credentials/:credential_id_0/:credential_id_1', credentialController.patch));
		this.use(route.del(root + 'credentials/:credential_id_0/:credential_id_1', credentialController.del));

		// Grants
		// ------

		this.use(route.post(root + 'grants', grantController.post));
		this.use(route.get(root + 'grants', grantController.query));
		this.use(route.get(root + 'grants/:module_id', grantController.get));
		this.use(route.patch(root + 'grants/:module_id', grantController.patch));
		this.use(route.del(root + 'grants/:module_id', grantController.del));

		// Roles
		// -----

		this.use(route.post(root + 'roles', roleController.post));
		this.use(route.get(root + 'roles', roleController.query));
		this.use(route.get(root + 'roles/:role_id', roleController.get));
		this.use(route.patch(root + 'roles/:role_id', roleController.patch));
		this.use(route.del(root + 'roles/:role_id', roleController.del));

		// Teams
		// -----
		// I think that these either don't belong in the auth service at all, or need to be better
		// thought out. Their purpose isn't exactly clear to me, especially in its relationships to
		// roles.
		//
		// All that said, we have an immediate need to set certain "default" settings on different
		// "classes" of user, and this is the rushed result. Please avoid getting too attached to the
		// idea of teams, and if you feel like you're bending to fit into their limitations, then
		// it's time to stop and re-do this the right way.

		this.use(route.post(root + 'teams', teamController.post));
		this.use(route.get(root + 'teams', teamController.query));
		this.use(route.get(root + 'teams/:team_id', teamController.get));
		this.use(route.patch(root + 'teams/:team_id', teamController.patch));
		this.use(route.del(root + 'teams/:team_id', teamController.del));

		// Users
		// -----

		this.use(route.post(root + 'users', userController.post));
		this.use(route.get(root + 'users', userController.query));
		this.use(route.get(root + 'users/:user_id', userController.get));
		this.use(route.patch(root + 'users/:user_id', userController.patch));
		this.use(route.del(root + 'users/:user_id', userController.del));
		this.use(route.get(root + 'me', userController.get));
		this.use(route.patch(root + 'me', userController.patch));
		this.use(route.del(root + 'me', userController.del));
	}
}
exports.default = AuthX;

// controllers

// strategies
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Authority = require('../models/Authority');

var _Authority2 = _interopRequireDefault(_Authority);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data, Strategy;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;

				if (data.strategy) {
					_context.next = 7;
					break;
				}

				throw new errors.ValidationError('A valid authority must be supplied.', { strategy: { required: true } });

			case 7:

				// get the strategy
				Strategy = ctx.app.strategies[data.strategy];

				if (Strategy) {
					_context.next = 10;
					break;
				}

				throw new errors.ValidationError('Strategy "' + data.strategy + '" not implemented.', { strategy: { enum: Object.keys(ctx.app.strategies) } });

			case 10:
				_context.next = 12;
				return regeneratorRuntime.awrap(Strategy.createAuthority(ctx.conn, data));

			case 12:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 14:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var authorities;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.*:read', false));

			case 2:
				_context2.next = 4;
				return regeneratorRuntime.awrap(_Authority2.default.query(ctx.conn));

			case 4:
				authorities = _context2.sent;
				_context2.next = 7;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(authorities, function (a) {
					return (0, _protect.can)(ctx, 'AuthX:authority.' + a.id + ':read');
				}));

			case 7:
				ctx.body = _context2.sent;

			case 8:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.' + ctx.params.authority_id + ':read'));

			case 2:
				_context3.next = 4;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 4:
				ctx.body = _context3.sent;

			case 5:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data, authority, Strategy;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.' + ctx.params.authority_id + ':update'));

			case 2:
				_context4.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context4.sent;
				_context4.next = 7;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 7:
				authority = _context4.sent;

				if (!(data.strategy && data.strategy !== authority.strategy)) {
					_context4.next = 10;
					break;
				}

				throw new errors.ValidationError('An authority\'s strategy cannot be changed.');

			case 10:

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context4.next = 13;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 13:
				_context4.next = 15;
				return regeneratorRuntime.awrap(Strategy.updateAuthority(authority, data));

			case 15:
				ctx.body = _context4.sent;

			case 16:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	var authority, Strategy;
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.' + ctx.params.authority_id + ':delete'));

			case 2:
				_context5.next = 4;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 4:
				authority = _context5.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context5.next = 8;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 8:
				_context5.next = 10;
				return regeneratorRuntime.awrap(Strategy.deleteAuthority(authority));

			case 10:
				ctx.body = _context5.sent;

			case 11:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _Client = require('../models/Client');

var _Client2 = _interopRequireDefault(_Client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:client:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;
				_context.next = 7;
				return regeneratorRuntime.awrap(_Client2.default.create(ctx.conn, data));

			case 7:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 9:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var clients;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:authority.*:read', false));

			case 2:
				_context2.next = 4;
				return regeneratorRuntime.awrap(_Client2.default.query(ctx.conn));

			case 4:
				clients = _context2.sent;
				_context2.next = 7;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(clients, function (c) {
					return (0, _protect.can)(ctx, 'AuthX:client.' + c.id + ':read');
				}));

			case 7:
				ctx.body = _context2.sent;

			case 8:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:client.' + ctx.params.client_id + ':read'));

			case 2:
				_context3.next = 4;
				return regeneratorRuntime.awrap(_Client2.default.get(ctx.conn, ctx.params.client_id));

			case 4:
				ctx.body = _context3.sent;

			case 5:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:client.' + ctx.params.client_id + ':update'));

			case 2:
				_context4.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context4.sent;

				if (!(typeof data.scopes !== 'undefined')) {
					_context4.next = 8;
					break;
				}

				_context4.next = 8;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:client.' + ctx.params.client_id + ':update.scopes'));

			case 8:
				_context4.next = 10;
				return regeneratorRuntime.awrap(_Client2.default.update(ctx.conn, ctx.params.client_id, data));

			case 10:
				ctx.body = _context4.sent;

			case 11:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:client.' + ctx.params.client_id + ':delete'));

			case 2:
				_context5.next = 4;
				return regeneratorRuntime.awrap(_Client2.default.delete(ctx.conn, ctx.params.client_id));

			case 4:
				ctx.body = _context5.sent;

			case 5:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Authority = require('../models/Authority');

var _Authority2 = _interopRequireDefault(_Authority);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data, _ref, _ref2, authority, Strategy, strategy;

	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 2:
				data = _context.sent;

				if (data.user_id) {
					_context.next = 5;
					break;
				}

				throw new errors.ValidationError('A valid credential must be supplied.', { user_id: { required: true } });

			case 5:
				if (!(!Array.isArray(data.id) || data.id.length !== 2)) {
					_context.next = 7;
					break;
				}

				throw new errors.ValidationError('A valid credential must be supplied.', { id: { type: 'array', schema: { '0': { type: 'string' }, '1': { type: 'string' } }, additionalItems: false } });

			case 7:
				_context.next = 9;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + data.id[0] + '.' + (ctx.user && ctx.user.id === data.user_id ? 'me' : 'user') + ':read'));

			case 9:
				_context.next = 11;
				return regeneratorRuntime.awrap(_bluebird2.default.all([

				// fetch the authority
				_Authority2.default.get(ctx.conn, data.id[0]).catch(function (err) {
					if (err instanceof errors.NotFoundError) throw new errors.ValidationError('The authority identified by `id[0]` does not exist.');

					throw err;
				}),

				// fetch the user
				_User2.default.get(ctx.conn, data.user_id).catch(function (err) {
					if (err instanceof errors.NotFoundError) throw new errors.ValidationError('The user identified by `user_id` does not exist.');

					throw err;
				})]));

			case 11:
				_ref = _context.sent;
				_ref2 = _slicedToArray(_ref, 1);
				authority = _ref2[0];

				// get the strategy

				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context.next = 17;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 17:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// create the credential

				_context.next = 20;
				return regeneratorRuntime.awrap(strategy.createCredential(data));

			case 20:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 22:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var credentials;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.*.*:read', false));

			case 2:
				_context2.t0 = regeneratorRuntime;
				_context2.t1 = _Credential2.default;
				_context2.t2 = ctx.conn;
				_context2.next = 7;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:credential.*.user:read', false));

			case 7:
				if (!_context2.sent) {
					_context2.next = 11;
					break;
				}

				_context2.t3 = undefined;
				_context2.next = 12;
				break;

			case 11:
				_context2.t3 = function (x) {
					return x.getAll(ctx.user.id, { index: 'user_id' });
				};

			case 12:
				_context2.t4 = _context2.t3;
				_context2.t5 = _context2.t1.query.call(_context2.t1, _context2.t2, _context2.t4);
				_context2.next = 16;
				return _context2.t0.awrap.call(_context2.t0, _context2.t5);

			case 16:
				credentials = _context2.sent;
				_context2.next = 19;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(credentials, function (c) {
					return (0, _protect.can)(ctx, 'AuthX:credential.' + c.authority_id + '.' + (ctx.user && ctx.user.id === c.user_id ? 'me' : 'user') + ':read');
				}));

			case 19:
				ctx.body = _context2.sent;

			case 20:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	var credential;
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap(_Credential2.default.get(ctx.conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]));

			case 2:
				credential = _context3.sent;
				_context3.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + credential.authority_id + '.' + (ctx.user && ctx.user.id === credential.user_id ? 'me' : 'user') + ':read'));

			case 5:
				ctx.body = credential;

			case 6:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data, credential, authority, Strategy, strategy;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 2:
				data = _context4.sent;
				_context4.next = 5;
				return regeneratorRuntime.awrap(_Credential2.default.get(ctx.conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]));

			case 5:
				credential = _context4.sent;
				_context4.next = 8;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + credential.authority_id + '.' + (ctx.user && ctx.user.id === credential.user_id ? 'me' : 'user') + ':update'));

			case 8:
				_context4.next = 10;
				return regeneratorRuntime.awrap(credential.authority());

			case 10:
				authority = _context4.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context4.next = 14;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 14:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// update the credential

				_context4.next = 17;
				return regeneratorRuntime.awrap(strategy.updateCredential(credential, data));

			case 17:
				ctx.body = _context4.sent;

			case 18:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	var credential, authority, Strategy, strategy;
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap(_Credential2.default.get(ctx.conn, [ctx.params.credential_id_0, ctx.params.credential_id_1]));

			case 2:
				credential = _context5.sent;
				_context5.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:credential.' + credential.authority_id + '.' + (ctx.user && ctx.user.id === credential.user_id ? 'me' : 'user') + ':delete'));

			case 5:
				_context5.next = 7;
				return regeneratorRuntime.awrap(credential.authority());

			case 7:
				authority = _context5.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context5.next = 11;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 11:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// delete the credential

				_context5.next = 14;
				return regeneratorRuntime.awrap(strategy.deleteCredential(credential));

			case 14:
				ctx.body = _context5.sent;

			case 15:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _Grant = require('../models/Grant');

var _Grant2 = _interopRequireDefault(_Grant);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:grant:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;
				_context.next = 7;
				return regeneratorRuntime.awrap(_Grant2.default.create(ctx.conn, data));

			case 7:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 9:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var grants;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:grant.*.*:read', false));

			case 2:
				_context2.t0 = regeneratorRuntime;
				_context2.t1 = _Grant2.default;
				_context2.t2 = ctx.conn;
				_context2.next = 7;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:grant.*.user:read', false));

			case 7:
				if (!_context2.sent) {
					_context2.next = 11;
					break;
				}

				_context2.t3 = undefined;
				_context2.next = 12;
				break;

			case 11:
				_context2.t3 = function (x) {
					return x.getAll(ctx.user.id, { index: 'user_id' });
				};

			case 12:
				_context2.t4 = _context2.t3;
				_context2.t5 = _context2.t1.query.call(_context2.t1, _context2.t2, _context2.t4);
				_context2.next = 16;
				return _context2.t0.awrap.call(_context2.t0, _context2.t5);

			case 16:
				grants = _context2.sent;
				_context2.next = 19;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(grants, function (g) {
					return (0, _protect.can)(ctx, 'AuthX:grant.' + g.client_id + '.' + (ctx.user && ctx.user.id === g.user_id ? 'me' : 'user') + ':read');
				}));

			case 19:
				ctx.body = _context2.sent;

			case 20:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	var grant;
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, ctx.params.grant_id));

			case 2:
				grant = _context3.sent;
				_context3.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:grant.' + grant.client_id + '.' + (ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':read'));

			case 5:
				ctx.body = grant;

			case 6:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data, grant;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 2:
				data = _context4.sent;
				_context4.next = 5;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, ctx.params.grant_id));

			case 5:
				grant = _context4.sent;
				_context4.next = 8;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:grant.' + grant.client_id + '.' + (ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':update'));

			case 8:
				_context4.next = 10;
				return regeneratorRuntime.awrap(grant.update(data));

			case 10:
				ctx.body = _context4.sent;

			case 11:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	var grant;
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, ctx.params.grant_id));

			case 2:
				grant = _context5.sent;
				_context5.next = 5;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:grant.' + grant.client_id + '.' + (ctx.user && ctx.user.id === grant.user_id ? 'me' : 'user') + ':delete'));

			case 5:
				_context5.next = 7;
				return regeneratorRuntime.awrap(_Grant2.default.delete(ctx.conn, ctx.params.grant_id));

			case 7:
				ctx.body = _context5.sent;

			case 8:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _Role = require('../models/Role');

var _Role2 = _interopRequireDefault(_Role);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;
				_context.next = 7;
				return regeneratorRuntime.awrap(_Role2.default.create(ctx.conn, data));

			case 7:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 9:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var roles;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role.*:read', false));

			case 2:
				_context2.next = 4;
				return regeneratorRuntime.awrap(_Role2.default.query(ctx.conn));

			case 4:
				roles = _context2.sent;
				_context2.next = 7;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(roles, function (r) {
					return (0, _protect.can)(ctx, 'AuthX:role.' + r.id + ':get');
				}));

			case 7:
				ctx.body = _context2.sent;

			case 8:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role.' + ctx.params.role_id + ':read'));

			case 2:
				_context3.next = 4;
				return regeneratorRuntime.awrap(_Role2.default.get(ctx.conn, ctx.params.role_id));

			case 4:
				ctx.body = _context3.sent;

			case 5:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role.' + ctx.params.role_id + ':update'));

			case 2:
				_context4.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context4.sent;

				if (!(typeof data.assignments !== 'undefined')) {
					_context4.next = 8;
					break;
				}

				_context4.next = 8;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role.' + ctx.params.role_id + ':update.assignments'));

			case 8:
				if (!(typeof data.scopes !== 'undefined')) {
					_context4.next = 11;
					break;
				}

				_context4.next = 11;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role.' + ctx.params.role_id + ':update.scopes'));

			case 11:
				_context4.next = 13;
				return regeneratorRuntime.awrap(_Role2.default.update(ctx.conn, ctx.params.role_id, data));

			case 13:
				ctx.body = _context4.sent;

			case 14:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:role.' + ctx.params.role_id + ':delete'));

			case 2:
				_context5.next = 4;
				return regeneratorRuntime.awrap(_Role2.default.delete(ctx.conn, ctx.params.role_id));

			case 4:
				ctx.body = _context5.sent;

			case 5:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _Authority = require('../models/Authority');

var _Authority2 = _interopRequireDefault(_Authority);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function _callee(ctx, next) {
	var authority, Strategy, strategy, user, token, respond;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				respond = function respond() {
					if (ctx.redirect_to && (ctx.status < 300 || ctx.status >= 400)) {
						let body = ctx.body;
						let query = _querystring2.default.stringify({
							status: ctx.status,
							body: JSON.stringify(body)
						});
						ctx.redirect(ctx.redirect_to + (ctx.redirect_to.includes('?') ? '&' : '?') + query);
						ctx.body = body;
					}
				};

				ctx.status = 204;

				_context.prev = 2;
				_context.next = 5;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 5:
				authority = _context.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context.next = 9;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 9:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// pass the request to the strategy

				_context.next = 12;
				return regeneratorRuntime.awrap(strategy.authenticate(ctx, next));

			case 12:
				user = _context.sent;

				if (user && user.status === 'active') {

					// generate token from user
					token = _jsonwebtoken2.default.sign({}, ctx.app.config.session_token.private_key, {
						algorithm: ctx.app.config.session_token.algorithm,
						expiresIn: ctx.app.config.session_token.expiresIn,
						audience: ctx.app.config.realm,
						subject: user.id,
						issuer: ctx.app.config.realm
					});

					// set the session cookie

					ctx.cookies.set('session', token);

					ctx.status = 200;
					ctx.body = { message: 'You have successfully logged in.' };
				}

				respond();

				_context.next = 23;
				break;

			case 17:
				_context.prev = 17;
				_context.t0 = _context['catch'](2);

				ctx.app.emit('error', _context.t0, ctx);

				// set the status
				ctx.status = _context.t0.status || 500;

				// display an error
				if (typeof _context.t0.expose === 'function') ctx.body = _context.t0.expose();else ctx.body = { message: _context.t0.expose ? _context.t0.message : 'An unknown error has occurred' };

				respond();

			case 23:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[2, 17]]);
};
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _Team = require('../models/Team');

var _Team2 = _interopRequireDefault(_Team);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function post(ctx) {
	var data;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:team:create'));

			case 2:
				_context.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context.sent;
				_context.next = 7;
				return regeneratorRuntime.awrap(_Team2.default.create(ctx.conn, data));

			case 7:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 9:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var teams;
	return regeneratorRuntime.async(function query$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap(_Team2.default.query(ctx.conn));

			case 2:
				teams = _context2.sent;
				_context2.next = 5;
				return regeneratorRuntime.awrap(_bluebird2.default.filter(teams, function (c) {
					return (0, _protect.can)(ctx, 'AuthX:team.' + c.id + ':read');
				}));

			case 5:
				ctx.body = _context2.sent;

			case 6:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}

function get(ctx) {
	return regeneratorRuntime.async(function get$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:team.' + ctx.params.team_id + ':read'));

			case 2:
				_context3.next = 4;
				return regeneratorRuntime.awrap(_Team2.default.get(ctx.conn, ctx.params.team_id));

			case 4:
				ctx.body = _context3.sent;

			case 5:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var data;
	return regeneratorRuntime.async(function patch$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				_context4.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:team.' + ctx.params.team_id + ':update'));

			case 2:
				_context4.next = 4;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 4:
				data = _context4.sent;
				_context4.next = 7;
				return regeneratorRuntime.awrap(_Team2.default.update(ctx.conn, ctx.params.team_id, data));

			case 7:
				ctx.body = _context4.sent;

			case 8:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function del(ctx) {
	return regeneratorRuntime.async(function del$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				_context5.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:team.' + ctx.params.team_id + ':delete'));

			case 2:
				_context5.next = 4;
				return regeneratorRuntime.awrap(_Team2.default.delete(ctx.conn, ctx.params.team_id));

			case 4:
				ctx.body = _context5.sent;

			case 5:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _scopes = require('../util/scopes');

var scopes = _interopRequireWildcard(_scopes);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Client = require('../models/Client');

var _Client2 = _interopRequireDefault(_Client);

var _Grant = require('../models/Grant');

var _Grant2 = _interopRequireDefault(_Grant);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let scopeRegex = /^(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)$/;

exports.default = function _callee(ctx) {
	var requestedScopes, client, grant, globallyAuthorizedScopes, authorizedScopes, userAuthorizedScopes, data, nonce, code, refresh_token, user, totalScopes, access_token;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				if (!(ctx.query.response_type === 'code')) {
					_context.next = 62;
					break;
				}

				if (ctx.query.client_id) {
					_context.next = 3;
					break;
				}

				throw new errors.ValidationError('A `client_id` must be defined.');

			case 3:
				if (ctx.query.redirect_uri) {
					_context.next = 5;
					break;
				}

				throw new errors.ValidationError('A `redirect_uri` must be defined.');

			case 5:
				if (!(typeof ctx.query.scope === 'undefined')) {
					_context.next = 7;
					break;
				}

				throw new errors.ValidationError('A `scope` must be defined.');

			case 7:

				// parse & validate the scopes
				requestedScopes = ctx.query.scope.split(' ');

				if (requestedScopes.every(function (s) {
					return scopeRegex.test(s);
				})) {
					_context.next = 10;
					break;
				}

				throw new errors.ValidationError('The `scope` parameter must be a space-separated list of AuthX scopes.');

			case 10:
				_context.next = 12;
				return regeneratorRuntime.awrap(_Client2.default.get(ctx.conn, ctx.query.client_id));

			case 12:
				client = _context.sent;

				if (!(!ctx.session || ctx.session.sub !== ctx.user.id)) {
					_context.next = 17;
					break;
				}

				ctx.redirect(ctx.app.config.routes.login + (ctx.app.config.routes.login.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(ctx.url));
				ctx.body = { url: ctx.url };
				return _context.abrupt('return');

			case 17:

				// start with globally authorized scopes for this client
				globallyAuthorizedScopes = client.scopes;
				authorizedScopes = globallyAuthorizedScopes.slice();
				userAuthorizedScopes = [];

				// do we also need user-authorized scopes?

				if (requestedScopes.every(function (rS) {
					return authorizedScopes.some(function (aS) {
						return scopes.can(aS, rS);
					});
				})) {
					_context.next = 52;
					break;
				}

				if (!(ctx.method === 'POST')) {
					_context.next = 37;
					break;
				}

				_context.prev = 22;
				_context.next = 25;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 25:
				data = _context.sent;

				if (!(!data.scopes || !Array.isArray(data.scopes) || !data.scopes.every(function (s) {
					return typeof s === 'string' && scopeRegex.test(s);
				}))) {
					_context.next = 28;
					break;
				}

				throw new Error();

			case 28:
				_context.next = 33;
				break;

			case 30:
				_context.prev = 30;
				_context.t0 = _context['catch'](22);
				throw new errors.ValidationError('Authorized `scopes` must be a json-encoded array of scopes.');

			case 33:

				userAuthorizedScopes = data.scopes;
				authorizedScopes = scopes.simplifyCollection(authorizedScopes.concat(userAuthorizedScopes));
				_context.next = 50;
				break;

			case 37:
				_context.prev = 37;
				_context.next = 40;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, [ctx.user.id, client.id]));

			case 40:
				grant = _context.sent;

				userAuthorizedScopes = grant.scopes;
				authorizedScopes = scopes.simplifyCollection(authorizedScopes.concat(userAuthorizedScopes));
				_context.next = 50;
				break;

			case 45:
				_context.prev = 45;
				_context.t1 = _context['catch'](37);

				if (!(_context.t1 instanceof errors.NotFoundError)) {
					_context.next = 49;
					break;
				}

				return _context.abrupt('return', requestApproval(ctx));

			case 49:
				throw _context.t1;

			case 50:
				if (requestedScopes.every(function (rS) {
					return authorizedScopes.some(function (aS) {
						return scopes.can(aS, rS);
					});
				})) {
					_context.next = 52;
					break;
				}

				return _context.abrupt('return', requestApproval(ctx));

			case 52:

				// generate and store an authorization code.
				nonce = _uuid2.default.v4();
				code = new Buffer(JSON.stringify([ctx.user.id, nonce])).toString('base64');
				_context.next = 56;
				return regeneratorRuntime.awrap(_Grant2.default.save(ctx.conn, [ctx.user.id, client.id], {
					nonce: nonce,
					scopes: userAuthorizedScopes
				}));

			case 56:
				grant = _context.sent;

				// redirect the user back to the client with an authorization code.
				ctx.redirect(ctx.query.redirect_uri + (ctx.query.redirect_uri.includes('?') ? '&' : '?') + 'code=' + code + '&state=' + ctx.query.state);
				ctx.body = { code: code };
				return _context.abrupt('return');

			case 62:
				if (!(ctx.method === 'POST')) {
					_context.next = 138;
					break;
				}

				if (!ctx.is('application/json')) {
					_context.next = 69;
					break;
				}

				_context.next = 66;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 66:
				data = _context.sent;
				_context.next = 73;
				break;

			case 69:
				if (!ctx.is('application/x-www-form-urlencoded')) {
					_context.next = 73;
					break;
				}

				_context.next = 72;
				return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

			case 72:
				data = _context.sent;

			case 73:
				if (data.client_id) {
					_context.next = 75;
					break;
				}

				throw new errors.ValidationError('A valid `client_id` must be provided.');

			case 75:
				if (data.client_secret) {
					_context.next = 77;
					break;
				}

				throw new errors.ValidationError('A valid `client_secret` must be provided.');

			case 77:
				_context.next = 79;
				return regeneratorRuntime.awrap(_Client2.default.get(ctx.conn, data.client_id));

			case 79:
				client = _context.sent;

				if (!(client.secret !== data.client_secret)) {
					_context.next = 82;
					break;
				}

				throw new errors.ForbiddenError('The client secret was incorrect.');

			case 82:
				if (!(data.grant_type === 'authorization_code')) {
					_context.next = 100;
					break;
				}

				if (data.code) {
					_context.next = 85;
					break;
				}

				throw new errors.ValidationError('A valid `code` must be provided.');

			case 85:
				_context.prev = 85;

				code = new Buffer(data.code, 'base64').toString('utf8');
				code = JSON.parse(code);

				if (!(!Array.isArray(code) || code.length !== 2 || typeof code[0] !== 'string' || typeof code[1] !== 'string')) {
					_context.next = 90;
					break;
				}

				throw new Error();

			case 90:
				_context.next = 95;
				break;

			case 92:
				_context.prev = 92;
				_context.t2 = _context['catch'](85);
				throw new errors.ValidationError('The provided `code` is invalid.');

			case 95:
				_context.next = 97;
				return regeneratorRuntime.awrap(_Grant2.default.getWithNonce(ctx.conn, [code[0], data.client_id], code[1]));

			case 97:
				grant = _context.sent;
				_context.next = 121;
				break;

			case 100:
				if (!(data.grant_type === 'refresh_token')) {
					_context.next = 120;
					break;
				}

				if (data.refresh_token) {
					_context.next = 103;
					break;
				}

				throw new errors.ValidationError('A valid `refresh_token` must be provided.');

			case 103:
				_context.prev = 103;

				refresh_token = new Buffer(data.refresh_token, 'base64').toString('utf8');
				refresh_token = JSON.parse(refresh_token);

				if (!(!Array.isArray(refresh_token) || refresh_token.length !== 2 || typeof refresh_token[0] !== 'string' || typeof refresh_token[1] !== 'string')) {
					_context.next = 108;
					break;
				}

				throw new Error();

			case 108:
				_context.next = 113;
				break;

			case 110:
				_context.prev = 110;
				_context.t3 = _context['catch'](103);
				throw new errors.ValidationError('The provided `refresh_token` is invalid.');

			case 113:
				_context.next = 115;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, [refresh_token[0], data.client_id]));

			case 115:
				grant = _context.sent;

				if (!(grant.refresh_token !== refresh_token[1])) {
					_context.next = 118;
					break;
				}

				throw new errors.ValidationError('The provided `refresh_token` is incorrect.');

			case 118:
				_context.next = 121;
				break;

			case 120:
				throw new errors.ValidationError('The `grant_type` must be "authorization_code" or "refresh_token".');

			case 121:
				_context.next = 123;
				return regeneratorRuntime.awrap(grant.user());

			case 123:
				user = _context.sent;

				// scopes globally authorized to the client
				globallyAuthorizedScopes = client.scopes;

				// all scopes (global + user) authorized by this grant

				authorizedScopes = scopes.simplifyCollection(globallyAuthorizedScopes.concat(grant.scopes));

				// all scopes (grant x user) authorized in the token

				_context.t4 = scopes;
				_context.t5 = authorizedScopes;
				_context.next = 130;
				return regeneratorRuntime.awrap(user.scopes());

			case 130:
				_context.t6 = _context.sent;
				totalScopes = _context.t4.combineCollections.call(_context.t4, _context.t5, _context.t6);

				// generate the access token
				access_token = _jsonwebtoken2.default.sign({
					type: 'access_token',
					scopes: totalScopes
				}, ctx.app.config.access_token.private_key, {
					algorithm: ctx.app.config.access_token.algorithm,
					expiresIn: ctx.app.config.access_token.expiresIn,
					audience: grant.client_id,
					subject: grant.user_id,
					issuer: ctx.app.config.realm
				});

				// respond with tokens

				ctx.status = 200;
				ctx.body = {
					access_token: access_token,
					refresh_token: new Buffer(JSON.stringify([user.id, grant.refresh_token])).toString('base64'),
					scope: authorizedScopes
				};

				// convenience, adds the user to the response if the token has access
				if (scopes.can(totalScopes, 'AuthX:me:read')) ctx.body.user = user;

				_context.next = 139;
				break;

			case 138:
				throw new errors.ValidationError('Missing `response_type=code` query parameter or POST body.');

			case 139:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[22, 30], [37, 45], [85, 92], [103, 110]]);
};

function requestApproval(ctx) {
	var url = encodeURIComponent(ctx.url);
	var scope = encodeURIComponent(ctx.query.scope);
	ctx.redirect(ctx.app.config.routes.authorize + (ctx.app.config.routes.authorize.includes('?') ? '&' : '?') + 'url=' + url + '&scope=' + scope);
	ctx.body = { url: url, scope: scope };
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.post = post;
exports.query = query;
exports.get = get;
exports.patch = patch;
exports.del = del;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _protect = require('../util/protect');

var _queryParams = require('../util/queryParams');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Role = require('../models/Role');

var _Role2 = _interopRequireDefault(_Role);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let includable = ['credentials', 'grants', 'roles', 'scopes', 'team'];

function post(ctx) {
	var includes, data, user;
	return regeneratorRuntime.async(function post$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.next = 2;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:user:create'));

			case 2:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context.next = 5;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 5:
				data = _context.sent;
				_context.next = 8;
				return regeneratorRuntime.awrap(_User2.default.create(ctx.conn, data));

			case 8:
				user = _context.sent;
				_context.next = 11;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 11:
				ctx.body = _context.sent;

				ctx.status = 201;

			case 13:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function query(ctx) {
	var ids, role_ids, roles, assignments, transformer, includes, users;
	return regeneratorRuntime.async(function query$(_context3) {
		while (1) switch (_context3.prev = _context3.next) {
			case 0:
				_context3.next = 2;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:me:read'));

			case 2:
				_context3.t0 = !_context3.sent;

				if (!_context3.t0) {
					_context3.next = 7;
					break;
				}

				_context3.next = 6;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:user:read'));

			case 6:
				_context3.t0 = !_context3.sent;

			case 7:
				if (!_context3.t0) {
					_context3.next = 9;
					break;
				}

				throw new errors.ForbiddenError('You lack permission for the required scope "AuthX:user:read".');

			case 9:
				_context3.next = 11;
				return regeneratorRuntime.awrap((0, _protect.can)(ctx, 'AuthX:user:read'));

			case 11:
				if (_context3.sent) {
					_context3.next = 15;
					break;
				}

				ids = [ctx.user.id];

				// restrict to provided roles
				_context3.next = 25;
				break;

			case 15:
				if (!ctx.query.roles) {
					_context3.next = 25;
					break;
				}

				role_ids = (0, _queryParams.parseRoles)(ctx);

				// make sure we have permission to access these roles

				_context3.next = 19;
				return regeneratorRuntime.awrap(_bluebird2.default.map(role_ids, function (id) {
					return (0, _protect.protect)(ctx, 'AuthX:role.' + id + ':read');
				}));

			case 19:
				_context3.next = 21;
				return regeneratorRuntime.awrap(_Role2.default.query(ctx.conn, function (x) {
					return x.getAll(_rethinkdb2.default.args(role_ids), { index: 'id' });
				}));

			case 21:
				roles = _context3.sent;

				// combine assignments
				assignments = {};

				roles.forEach(function (role) {
					Object.keys(role.assignments).forEach(function (a) {
						if (role.assignments[a]) assignments[a] = true;
					});
				});

				// get user IDs
				ids = Object.keys(assignments);

			case 25:
				transformer = function (x) {
					var index;

					// restrict to known ids

					if (ids) {
						x = x.getAll(_rethinkdb2.default.args(ids), { index: 'id' });
						index = 'id';
					}

					// order
					if (!index || index === 'created') {
						x = x.orderBy({ index: 'created' });
						index = 'created';
					} else x = x.orderBy('created');

					// filter by status
					if (ctx.query.status) if (!index || index === 'status') {
						x = x.getAll(ctx.query.status, { index: 'status' });
						index = 'status';
					} else x = x.filter({ status: ctx.query.status });

					// fuzzy search by name
					var search = ctx.query.search ? ctx.query.search.toLowerCase() : null;
					if (ctx.query.search) x = x.filter(function (row) {
						return _rethinkdb2.default.or(row('profile')('displayName').downcase().match(search), row('profile')('nickname').default('').downcase().match(search), row('profile')('name')('familyName').default('').downcase().match(search), row('profile')('name')('givenName').default('').downcase().match(search), row('profile')('name')('middleName').default('').downcase().match(search));
					});

					// skip
					var skip = parseInt(ctx.query.skip);
					if (skip) x = x.skip(skip);

					// limit
					var limit = parseInt(ctx.query.limit);
					if (limit) x = x.limit(limit);

					return x;
				};

				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context3.next = 29;
				return regeneratorRuntime.awrap(_User2.default.query(ctx.conn, transformer));

			case 29:
				users = _context3.sent;
				_context3.next = 32;
				return regeneratorRuntime.awrap(_bluebird2.default.all(users.map(function _callee(u) {
					return regeneratorRuntime.async(function _callee$(_context2) {
						while (1) switch (_context2.prev = _context2.next) {
							case 0:
								_context2.next = 2;
								return regeneratorRuntime.awrap(include(u, includes, ctx));

							case 2:
								return _context2.abrupt('return', _context2.sent);

							case 3:
							case 'end':
								return _context2.stop();
						}
					}, null, this);
				})));

			case 32:
				ctx.body = _context3.sent;

			case 33:
			case 'end':
				return _context3.stop();
		}
	}, null, this);
}

function get(ctx) {
	var user_id, includes, user;
	return regeneratorRuntime.async(function get$(_context4) {
		while (1) switch (_context4.prev = _context4.next) {
			case 0:
				user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
				_context4.next = 3;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':read'));

			case 3:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context4.next = 6;
				return regeneratorRuntime.awrap(_User2.default.get(ctx.conn, user_id));

			case 6:
				user = _context4.sent;
				_context4.next = 9;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 9:
				ctx.body = _context4.sent;

			case 10:
			case 'end':
				return _context4.stop();
		}
	}, null, this);
}

function patch(ctx) {
	var user_id, includes, data, user;
	return regeneratorRuntime.async(function patch$(_context5) {
		while (1) switch (_context5.prev = _context5.next) {
			case 0:
				user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
				_context5.next = 3;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':update'));

			case 3:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);
				_context5.next = 6;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 6:
				data = _context5.sent;
				_context5.next = 9;
				return regeneratorRuntime.awrap(_User2.default.update(ctx.conn, user_id, data));

			case 9:
				user = _context5.sent;
				_context5.next = 12;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 12:
				ctx.body = _context5.sent;

			case 13:
			case 'end':
				return _context5.stop();
		}
	}, null, this);
}

function del(ctx) {
	var user_id, includes, user;
	return regeneratorRuntime.async(function del$(_context6) {
		while (1) switch (_context6.prev = _context6.next) {
			case 0:
				user_id = ctx.params.user_id || (ctx.user ? ctx.user.id : null);
				_context6.next = 3;
				return regeneratorRuntime.awrap((0, _protect.protect)(ctx, 'AuthX:' + (ctx.user && ctx.user.id === user_id ? 'me' : 'user') + ':delete'));

			case 3:
				includes = (0, _queryParams.parseIncludes)(includable, ctx);

				// make sure to include credentials, which are automatically deleted with the user

				includes = includes || [];
				if (includes.indexOf('credentials') === -1) includes.push('credentials');

				_context6.next = 8;
				return regeneratorRuntime.awrap(_User2.default.delete(ctx.conn, user_id));

			case 8:
				user = _context6.sent;
				_context6.next = 11;
				return regeneratorRuntime.awrap(include(user, includes, ctx));

			case 11:
				ctx.body = _context6.sent;

			case 12:
			case 'end':
				return _context6.stop();
		}
	}, null, this);
}

function include(user, includes, ctx) {
	var results, included;
	return regeneratorRuntime.async(function include$(_context8) {
		while (1) switch (_context8.prev = _context8.next) {
			case 0:
				if (!(!includes || !includes.length)) {
					_context8.next = 2;
					break;
				}

				return _context8.abrupt('return', user);

			case 2:
				_context8.next = 4;
				return regeneratorRuntime.awrap(_bluebird2.default.map(includes, function _callee2(i) {
					var result;
					return regeneratorRuntime.async(function _callee2$(_context7) {
						while (1) switch (_context7.prev = _context7.next) {
							case 0:
								_context7.next = 2;
								return regeneratorRuntime.awrap(user[i]());

							case 2:
								result = _context7.sent;

								if (!(i === 'credentials')) {
									_context7.next = 7;
									break;
								}

								_context7.next = 6;
								return regeneratorRuntime.awrap(_bluebird2.default.filter(result, function (c) {
									return (0, _protect.can)(ctx, 'AuthX:credential.' + c.authority_id + '.' + (ctx.user && ctx.user.id === user.id ? 'me' : 'user') + ':read');
								}));

							case 6:
								result = _context7.sent;

							case 7:
								if (!(i === 'grants')) {
									_context7.next = 11;
									break;
								}

								_context7.next = 10;
								return regeneratorRuntime.awrap(_bluebird2.default.filter(result, function (g) {
									return (0, _protect.can)(ctx, 'AuthX:grant.' + g.client_id + '.' + (ctx.user && ctx.user.id === user.id ? 'me' : 'user') + ':read');
								}));

							case 10:
								result = _context7.sent;

							case 11:
								if (!(i === 'roles')) {
									_context7.next = 15;
									break;
								}

								_context7.next = 14;
								return regeneratorRuntime.awrap(_bluebird2.default.filter(result, function (r) {
									return (0, _protect.can)(ctx, 'AuthX:role.' + r.id + ':read');
								}));

							case 14:
								result = _context7.sent;

							case 15:
								return _context7.abrupt('return', result);

							case 16:
							case 'end':
								return _context7.stop();
						}
					}, null, this);
				}));

			case 4:
				results = _context8.sent;

				// assign the results to a new object
				included = Object.assign(Object.create(_User2.default.prototype), user);

				results.forEach(function (v, i) {
					return included[includes[i]] = v;
				});

				// return the user with includes
				return _context8.abrupt('return', included);

			case 8:
			case 'end':
				return _context8.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let parser = /^Bearer\s+([^\s]+)\s*$/;

exports.default = function _callee(ctx, next) {
	var parsed;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				ctx.bearer = null;

				// parse the authorization header
				parsed = ctx.headers.authorization ? ctx.headers.authorization.match(parser) : null;

				// verify the JWT against all public keys

				if (!(parsed && parsed[1] && !ctx.app.config.access_token.public.some(function (pub) {
					try {
						return ctx.bearer = _jsonwebtoken2.default.verify(parsed[1], pub.key, {
							algorithms: [pub.algorithm],
							issuer: ctx.app.config.realm
						});
					} catch (err) {
						return;
					}
				}))) {
					_context.next = 4;
					break;
				}

				throw errors.AuthenticationError('The supplied bearer token is invalid.');

			case 4:
				return _context.abrupt('return', next());

			case 5:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};
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
				_context.next = 11;
				return regeneratorRuntime.awrap(next());

			case 11:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};
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
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _errors = require('../errors');

var _errors2 = _interopRequireDefault(_errors);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function _callee(ctx, next) {
	var token, cookie;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:

				// parse the session cookie for a token
				cookie = ctx.cookies.get('session');

				if (cookie) ctx.app.config.session_token.public.some(function (pub) {
					try {
						return token = ctx.session = _jsonwebtoken2.default.verify(cookie, pub.key, {
							algorithms: [pub.algorithm],
							issuer: ctx.app.config.realm
						});
					} catch (err) {
						return;
					}
				});

				// use the bearer token if present
				if (!token) token = ctx.bearer || null;

				// get the user

				if (!(token && token.sub)) {
					_context.next = 7;
					break;
				}

				_context.next = 6;
				return regeneratorRuntime.awrap(_User2.default.get(ctx.conn, token.sub));

			case 6:
				ctx.user = _context.sent;

			case 7:
				if (!(ctx.user && ctx.user.status !== 'active')) {
					_context.next = 9;
					break;
				}

				throw new _errors2.default.ForbiddenError('Your user account has been disabled.');

			case 9:
				return _context.abrupt('return', next());

			case 10:
			case 'end':
				return _context.stop();
		}
	}, null, this);
};
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _Credential = require('./Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const CREDENTIALS = Symbol('credentials');

class Authority extends _Model2.default {

	static get table() {
		return 'authorities';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('authority', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid authority must be supplied.', err.validation);

				case 5:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 6:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('authority', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid authority must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 9:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('authority', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid authority must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	credentials(refresh) {
		var _this = this;

		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					if (!(!this[CREDENTIALS] || refresh)) {
						_context4.next = 4;
						break;
					}

					_context4.next = 3;
					return regeneratorRuntime.awrap(_Credential2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this.id, { index: 'authority_id' });
					}));

				case 3:
					this[CREDENTIALS] = _context4.sent;

				case 4:
					return _context4.abrupt('return', this[CREDENTIALS]);

				case 5:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

}
exports.default = Authority;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Client extends _Model2.default {

	static get table() {
		return 'clients';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('client', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid client must be supplied.', err.validation);

				case 5:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 6:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('client', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid client must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 9:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('client', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid client must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

}
exports.default = Client;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _User = require('./User');

var _User2 = _interopRequireDefault(_User);

var _Authority = require('./Authority');

var _Authority2 = _interopRequireDefault(_Authority);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const USER = Symbol('user');
const AUTHORITY = Symbol('authority');

class Credential extends _Model2.default {

	static get table() {
		return 'credentials';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize the authority_user_id and profile ID
					if (data.id && data.id[1] && data.profile && typeof data.profile.id === 'undefined') data.profile.id = data.id[1];

					// validate data
					err = (0, _validator2.default)('credential', data, { useDefault: true });

					if (!err) {
						_context.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

				case 7:
					if (!(data.profile && data.profile.id !== data.id[1])) {
						_context.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `authority_user_id`.');

				case 9:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 10:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize the authority_user_id and profile ID
					if (data.id && data.id[1] && data.profile && typeof data.profile.id === 'undefined') data.profile.id = data.id[1];

					// validate data
					err = (0, _validator2.default)('credential', data, { useDefault: true });

					if (!err) {
						_context2.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

				case 7:
					if (!(data.profile && data.profile.id !== data.id[1])) {
						_context2.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `authority_user_id`.');

				case 9:
					if (!(!Array.isArray(data.id) || data.id.some(function (v, i) {
						return v !== id[i];
					}))) {
						_context2.next = 11;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 11:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 13:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('credential', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	user(refresh) {
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					if (!(!this[USER] || refresh)) {
						_context4.next = 4;
						break;
					}

					_context4.next = 3;
					return regeneratorRuntime.awrap(_User2.default.get(this[_Model2.default.Symbols.CONN], this.user_id));

				case 3:
					this[USER] = _context4.sent;

				case 4:
					return _context4.abrupt('return', this[USER]);

				case 5:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	authority(refresh) {
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					if (!(!this[AUTHORITY] || refresh)) {
						_context5.next = 4;
						break;
					}

					_context5.next = 3;
					return regeneratorRuntime.awrap(_Authority2.default.get(this[_Model2.default.Symbols.CONN], this.authority_id));

				case 3:
					this[AUTHORITY] = _context5.sent;

				case 4:
					return _context5.abrupt('return', this[AUTHORITY]);

				case 5:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	get authority_id() {
		return this.id[0];
	}

}
exports.default = Credential;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _User = require('./User');

var _User2 = _interopRequireDefault(_User);

var _Client = require('./Client');

var _Client2 = _interopRequireDefault(_Client);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const USER = Symbol('user');
const CLIENT = Symbol('client');

class Grant extends _Model2.default {

	static get table() {
		return 'grants';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('grant', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

				case 5:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 6:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('grant', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// default `refresh_token` to existing one, or generate new one
					if (typeof data.refresh_token === 'undefined') data.refresh_token = _rethinkdb2.default.row('refresh_token').default(_uuid2.default.v4());

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 10:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('grant', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	static getWithNonce(conn, id, nonce) {
		var result;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(_rethinkdb2.default.table(this.table).get(id).update(function (row) {
						return _rethinkdb2.default.branch(row('nonce').eq(nonce), row.merge({ nonce: null }), row);
					}, { returnChanges: 'always' }).run(conn));

				case 2:
					result = _context4.sent;

					if (!(result.errors > 0)) {
						_context4.next = 5;
						break;
					}

					throw this.parseRethinkError(result.first_error);

				case 5:
					if (result.replaced) {
						_context4.next = 7;
						break;
					}

					throw new errors.NotFoundError('The requested grant does not exist, or the authorization code has already been used.');

				case 7:
					return _context4.abrupt('return', new this(conn, result.changes[0].new_val));

				case 8:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	user(refresh) {
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					if (!(!this[USER] || refresh)) {
						_context5.next = 4;
						break;
					}

					_context5.next = 3;
					return regeneratorRuntime.awrap(_User2.default.get(this[_Model2.default.Symbols.CONN], this.user_id));

				case 3:
					this[USER] = _context5.sent;

				case 4:
					return _context5.abrupt('return', this[USER]);

				case 5:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	client(refresh) {
		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:
					if (!(!this[CLIENT] || refresh)) {
						_context6.next = 4;
						break;
					}

					_context6.next = 3;
					return regeneratorRuntime.awrap(_Client2.default.get(this[_Model2.default.Symbols.CONN], this.client_id));

				case 3:
					this[CLIENT] = _context6.sent;

				case 4:
					return _context6.abrupt('return', this[CLIENT]);

				case 5:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	get user_id() {
		return this.id[0];
	}

	get client_id() {
		return this.id[1];
	}

}
exports.default = Grant;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _User = require('./User');

var _User2 = _interopRequireDefault(_User);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _scopes = require('../util/scopes');

var scopes = _interopRequireWildcard(_scopes);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const USERS = Symbol('users');

class Role extends _Model2.default {

	static get table() {
		return 'roles';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('role', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid role must be supplied.', err.validation);

				case 5:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 6:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('role', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid role must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 9:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('role', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid role must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	users(refresh) {
		var _this = this;

		var assignments;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					if (!(!this[USERS] || refresh)) {
						_context4.next = 5;
						break;
					}

					assignments = Object.keys(this.assignments).filter(function (k) {
						return _this.assignments[k];
					});
					_context4.next = 4;
					return regeneratorRuntime.awrap(_User2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_rethinkdb2.default.args(assignments));
					}));

				case 4:
					this[USERS] = _context4.sent;

				case 5:
					return _context4.abrupt('return', this[USERS]);

				case 6:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	can(scope, strict) {
		return scopes.can(this.scopes, scope, strict);
	}

}
exports.default = Role;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Team extends _Model2.default {

	static get table() {
		return 'teams';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({}, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('team', data, { useDefault: true });

					if (!err) {
						_context.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid team must be supplied.', err.validation);

				case 5:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 6:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id }, data, { created: now, last_updated: now });

					// validate data
					err = (0, _validator2.default)('team', data, { useDefault: true });

					if (!err) {
						_context2.next = 5;
						break;
					}

					throw new errors.ValidationError('A valid team must be supplied.', err.validation);

				case 5:
					if (!(data.id !== id)) {
						_context2.next = 7;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 7:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 9:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('team', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid team must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

}
exports.default = Team;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

var _Model = require('../Model');

var _Model2 = _interopRequireDefault(_Model);

var _Role = require('./Role');

var _Role2 = _interopRequireDefault(_Role);

var _Grant = require('./Grant');

var _Grant2 = _interopRequireDefault(_Grant);

var _Credential = require('./Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _Team = require('./Team');

var _Team2 = _interopRequireDefault(_Team);

var _validator = require('../util/validator');

var _validator2 = _interopRequireDefault(_validator);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ROLES = Symbol('roles');
const GRANTS = Symbol('grants');
const CREDENTIALS = Symbol('credentials');
const SCOPES = Symbol('scopes');
const TEAM = Symbol('team');

class User extends _Model2.default {

	static get table() {
		return 'users';
	}

	static create(conn, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: _uuid2.default.v4(), profile: {} }, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize ID
					if (!data.profile || typeof data.profile.id === 'undefined') data.profile.id = data.id;

					// validate data
					err = (0, _validator2.default)('user', data, { useDefault: true });

					if (!err) {
						_context.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid user must be supplied.', err.validation);

				case 7:
					if (!(data.profile.id !== data.id)) {
						_context.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `id`.');

				case 9:
					return _context.abrupt('return', _Model2.default.create.call(this, conn, data));

				case 10:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	static save(conn, id, data) {
		var now, err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					now = Date.now() / 1000;

					data = Object.assign({ id: id, profile: {} }, data, { created: now, last_updated: now });
					data.profile = data.profile ? Object.assign({}, data.profile) : null;

					// normalize ID
					if (!data.profile || typeof data.profile.id === 'undefined') data.profile.id = data.id;

					// validate data
					err = (0, _validator2.default)('user', data, { useDefault: true });

					if (!err) {
						_context2.next = 7;
						break;
					}

					throw new errors.ValidationError('A valid user must be supplied.', err.validation);

				case 7:
					if (!(data.profile.id !== data.id)) {
						_context2.next = 9;
						break;
					}

					throw new errors.ValidationError('If a profile ID is present, it must match the `id`.');

				case 9:
					if (!(data.id !== id)) {
						_context2.next = 11;
						break;
					}

					throw new Error('The supplied `id` did not match the `id` in the data.');

				case 11:

					// don't overwrite an existing `created` timestamp
					data.created = _rethinkdb2.default.row('created').default(data.created);

					// save the model (use super.create when babel.js supports it)
					return _context2.abrupt('return', _Model2.default.save.call(this, conn, id, data));

				case 13:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static update(conn, id, data) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

					// validate data
					err = (0, _validator2.default)('user', data, { checkRequired: false });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('A valid user must be supplied.', err.validation);

				case 4:
					return _context3.abrupt('return', _Model2.default.update.call(this, conn, id, data));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	static delete(conn, id) {
		var credentials, user;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					_context4.next = 2;
					return regeneratorRuntime.awrap(_Credential2.default.query(conn, function (q) {
						return q.getAll(id, { index: 'user_id' }).delete({ returnChanges: 'always' }).do(function (results) {
							return _rethinkdb2.default.branch(results('deleted').gt(0), results('changes').map(function (d) {
								return d('old_val');
							}), []);
						});
					}));

				case 2:
					credentials = _context4.sent;
					_context4.next = 5;
					return regeneratorRuntime.awrap(_Model2.default.delete.call(this, conn, id));

				case 5:
					user = _context4.sent;

					// attach the deleted credentials
					user[CREDENTIALS] = credentials;

					return _context4.abrupt('return', user);

				case 8:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	credentials(refresh) {
		var _this = this;

		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					if (!(!this[CREDENTIALS] || refresh)) {
						_context5.next = 4;
						break;
					}

					_context5.next = 3;
					return regeneratorRuntime.awrap(_Credential2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this.id, { index: 'user_id' });
					}));

				case 3:
					this[CREDENTIALS] = _context5.sent;

				case 4:
					return _context5.abrupt('return', this[CREDENTIALS]);

				case 5:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

	roles(refresh) {
		var _this2 = this;

		return regeneratorRuntime.async(function _callee6$(_context6) {
			while (1) switch (_context6.prev = _context6.next) {
				case 0:
					if (!(!this[ROLES] || refresh)) {
						_context6.next = 4;
						break;
					}

					_context6.next = 3;
					return regeneratorRuntime.awrap(_Role2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this2.id, { index: 'assignments' });
					}));

				case 3:
					this[ROLES] = _context6.sent;

				case 4:
					return _context6.abrupt('return', this[ROLES]);

				case 5:
				case 'end':
					return _context6.stop();
			}
		}, null, this);
	}

	grants(refresh) {
		var _this3 = this;

		return regeneratorRuntime.async(function _callee7$(_context7) {
			while (1) switch (_context7.prev = _context7.next) {
				case 0:
					if (!(!this[GRANTS] || refresh)) {
						_context7.next = 4;
						break;
					}

					_context7.next = 3;
					return regeneratorRuntime.awrap(_Grant2.default.query(this[_Model2.default.Symbols.CONN], function (q) {
						return q.getAll(_this3.id, { index: 'user_id' });
					}));

				case 3:
					this[GRANTS] = _context7.sent;

				case 4:
					return _context7.abrupt('return', this[GRANTS]);

				case 5:
				case 'end':
					return _context7.stop();
			}
		}, null, this);
	}

	team(refresh) {
		return regeneratorRuntime.async(function _callee8$(_context8) {
			while (1) switch (_context8.prev = _context8.next) {
				case 0:
					if (!(!this[TEAM] || refresh)) {
						_context8.next = 9;
						break;
					}

					if (!this.team_id) {
						_context8.next = 7;
						break;
					}

					_context8.next = 4;
					return regeneratorRuntime.awrap(_Team2.default.get(this[_Model2.default.Symbols.CONN], this.team_id));

				case 4:
					_context8.t0 = _context8.sent;
					_context8.next = 8;
					break;

				case 7:
					_context8.t0 = null;

				case 8:
					this[TEAM] = _context8.t0;

				case 9:
					return _context8.abrupt('return', this[TEAM]);

				case 10:
				case 'end':
					return _context8.stop();
			}
		}, null, this);
	}

	scopes(refresh) {
		var roles, scopes;
		return regeneratorRuntime.async(function _callee9$(_context9) {
			while (1) switch (_context9.prev = _context9.next) {
				case 0:
					if (!(!this[SCOPES] || refresh)) {
						_context9.next = 6;
						break;
					}

					_context9.next = 3;
					return regeneratorRuntime.awrap(this.roles());

				case 3:
					roles = _context9.sent;
					scopes = roles.map(function (role) {
						return role.scopes;
					});

					this[SCOPES] = scopes.length ? scopes.reduce(function (a, b) {
						return a.concat(b);
					}) : scopes;

				case 6:
					return _context9.abrupt('return', this[SCOPES]);

				case 7:
				case 'end':
					return _context9.stop();
			}
		}, null, this);
	}

	can(scope, strict) {
		var roles;
		return regeneratorRuntime.async(function _callee10$(_context10) {
			while (1) switch (_context10.prev = _context10.next) {
				case 0:
					_context10.next = 2;
					return regeneratorRuntime.awrap(this.roles());

				case 2:
					roles = _context10.sent;
					return _context10.abrupt('return', roles.some(function (role) {
						return role.can(scope, strict);
					}));

				case 4:
				case 'end':
					return _context10.stop();
			}
		}, null, this);
	}

}
exports.default = User;
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _handlebars = require('handlebars');

var _handlebars2 = _interopRequireDefault(_handlebars);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Strategy = require('../Strategy');

var _Strategy2 = _interopRequireDefault(_Strategy);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		expiresIn: {
			type: 'number',
			default: 900
		},
		subject: {
			type: ['null', 'string'],
			title: 'Email Subject',
			description: 'Handlebars template used to generate the email subject. Provided `token`, `credential`, and `url`.'
		},
		text: {
			type: ['null', 'string'],
			title: 'Email Plain Text Body',
			description: 'Handlebars template used to generate the email plain text body. Provided `token`, `credential`, and `url`.'
		},
		html: {
			type: ['null', 'string'],
			title: 'Email HTML Body',
			description: 'Handlebars template used to generate the email HTML body. Provided `token`, `credential`, and `url`.'
		}
	}
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {}
});

class EmailStrategy extends _Strategy2.default {

	authenticate(ctx) {
		var _this = this;

		var request, token, credential, _ref, _ref2, user, templateContext;

		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					ctx.redirect_to = ctx.query.url;
					request = ctx.query;

					// HTTP POST (json)

					if (!(ctx.method === 'POST' && ctx.is('application/json'))) {
						_context.next = 8;
						break;
					}

					_context.next = 5;
					return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

				case 5:
					request = _context.sent;
					_context.next = 12;
					break;

				case 8:
					if (!(ctx.method === 'POST' && ctx.is('application/x-www-form-urlencoded'))) {
						_context.next = 12;
						break;
					}

					_context.next = 11;
					return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

				case 11:
					request = _context.sent;

				case 12:
					if (!request.token) {
						_context.next = 29;
						break;
					}

					ctx.app.config.session_token.public.some(function (pub) {
						try {
							return token = _jsonwebtoken2.default.verify(request.token, pub.key, {
								algorithms: [pub.algorithm],
								audience: ctx.app.config.realm + ':session.' + _this.authority.id,
								issuer: ctx.app.config.realm + ':session.' + _this.authority.id
							});
						} catch (err) {
							return;
						}
					});

					if (token) {
						_context.next = 16;
						break;
					}

					throw new errors.AuthenticationError('The supplied token is invalid or expired.');

				case 16:
					_context.next = 18;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, token.sub));

				case 18:
					credential = _context.sent;

					if (!(new Date(credential.last_used) > new Date(token.iat))) {
						_context.next = 21;
						break;
					}

					throw new errors.AuthenticationError('This credential has been used since the token was issued.');

				case 21:
					_context.next = 23;
					return regeneratorRuntime.awrap(Promise.all([

					// get the user
					_User2.default.get(this.conn, credential.user_id),

					// update the credential's last_used timestamp
					credential.update({ last_used: Date.now() / 1000 })]));

				case 23:
					_ref = _context.sent;
					_ref2 = _slicedToArray(_ref, 1);
					user = _ref2[0];

					// return the user

					return _context.abrupt('return', user);

				case 29:
					if (!request.email) {
						_context.next = 41;
						break;
					}

					_context.next = 32;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, request.email]));

				case 32:
					credential = _context.sent;

					// generate token from user
					token = _jsonwebtoken2.default.sign({}, ctx.app.config.session_token.private_key, {
						algorithm: ctx.app.config.session_token.algorithm,
						expiresIn: this.authority.expiresIn,
						audience: ctx.app.config.realm + ':session.' + this.authority.id,
						subject: credential.id,
						issuer: ctx.app.config.realm + ':session.' + this.authority.id
					});
					templateContext = {
						token: token,
						credential: credential,
						url: ctx.request.href + (ctx.request.href.includes('?') ? '&' : '?') + 'token=' + token
					};

					// send the token in an email

					_context.next = 37;
					return regeneratorRuntime.awrap(ctx.app.mail({
						to: request.email,
						subject: _handlebars2.default.compile(this.authority.details.subject || 'Authenticate by email')(templateContext),
						text: _handlebars2.default.compile(this.authority.details.text || 'Please authenticate at the following URL: {{{url}}}')(templateContext),
						html: _handlebars2.default.compile(this.authority.details.html || 'Please click <a href="{{url}}">here</a> to authenticate.')(templateContext)
					}));

				case 37:

					ctx.status = 202;
					ctx.body = { message: 'Token sent to "' + request.email + '".' };

					_context.next = 42;
					break;

				case 41:
					throw new errors.ValidationError('You must send an email address or token.');

				case 42:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		var err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:

					// validate data
					err = env.validate('authority', data, { useDefault: true });

					if (!err) {
						_context2.next = 3;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 3:
					return _context2.abrupt('return', _Strategy2.default.createAuthority.call(this, conn, data));

				case 4:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:

					// validate data
					err = env.validate('authority', delta, { useDefault: true });

					if (!err) {
						_context3.next = 3;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 3:
					return _context3.abrupt('return', _Strategy2.default.updateAuthority.call(this, authority, delta));

				case 4:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		var err;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:

					// validate data
					err = env.validate('credential', data, { useDefault: true });

					if (!err) {
						_context4.next = 3;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 3:
					return _context4.abrupt('return', _Strategy2.default.prototype.createCredential.call(this, data));

				case 4:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		var err;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:

					// validate data
					err = env.validate('credential', delta, { useDefault: true });

					if (!err) {
						_context5.next = 3;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 3:
					return _context5.abrupt('return', _Strategy2.default.prototype.updateCredential.call(this, credential, delta));

				case 4:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

}
exports.default = EmailStrategy;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _profile = require('../../schema/profile');

var _profile2 = _interopRequireDefault(_profile);

var _Strategy = require('../Strategy');

var _Strategy2 = _interopRequireDefault(_Strategy);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _Role = require('../models/Role');

var _Role2 = _interopRequireDefault(_Role);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		client_id: {
			type: 'string',
			title: 'Client ID'
		},
		client_secret: {
			type: 'string',
			title: 'Client Secret'
		},
		email_authority_id: {
			type: ['null', 'string'],
			title: 'Email Authority ID',
			description: 'The ID of an email authority with which verified email addresses can be registered.',
			default: null
		},
		email_domains: {
			type: ['null', 'array'],
			title: 'Email Domains',
			description: 'Restrict creation of new users to these domain names. If null, all domains are allowed.',
			items: {
				type: 'string'
			},
			default: null
		},
		role_ids: {
			type: 'array',
			title: 'Role IDs',
			description: 'The IDs of AuthX roles to assign any users verified by this authority.',
			default: []
		}
	},
	required: ['client_id', 'client_secret']
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {}
});

env.addSchema(_profile2.default);

function without(o, key) {
	o = Object.assign({}, o);
	delete o[key];
	return o;
}

class OAuth2Strategy extends _Strategy2.default {

	authenticate(ctx) {
		var _this = this;

		var state, response, profile, err, details, credential, user, email_credential, assignments, parts;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					if (!ctx.query.code) {
						_context.next = 77;
						break;
					}

					// retrieve the url from the cookie
					ctx.redirect_to = ctx.cookies.get('AuthX/session/' + this.authority.id + '/url');
					ctx.cookies.set('AuthX/session/' + this.authority.id + '/url');

					// retreive the state from the cookie
					state = ctx.cookies.get('AuthX/session/' + this.authority.id + '/state');

					if (!(ctx.query.state !== state)) {
						_context.next = 6;
						break;
					}

					throw new errors.ValidationError('Mismatched state parameter.');

				case 6:
					_context.t0 = JSON;
					_context.next = 9;
					return regeneratorRuntime.awrap((0, _requestPromise2.default)({
						method: 'POST',
						uri: 'https://www.googleapis.com/oauth2/v3/token',
						form: {
							client_id: this.authority.details.client_id,
							client_secret: this.authority.details.client_secret,
							redirect_uri: ctx.request.protocol + '://' + ctx.request.host + ctx.request.path,
							grant_type: 'authorization_code',
							code: ctx.query.code,
							state: state
						}
					}));

				case 9:
					_context.t1 = _context.sent;
					response = _context.t0.parse.call(_context.t0, _context.t1);
					_context.t2 = JSON;
					_context.next = 14;
					return regeneratorRuntime.awrap((0, _requestPromise2.default)({
						method: 'GET',
						uri: 'https://www.googleapis.com/plus/v1/people/me',
						headers: {
							'Authorization': 'Bearer ' + response.access_token
						}
					}));

				case 14:
					_context.t3 = _context.sent;
					profile = _context.t2.parse.call(_context.t2, _context.t3);

					// normalize the profile with our schema
					if (profile.url && !profile.urls) profile.urls = [{ value: profile.url }];

					if (profile.image && profile.image.url && !profile.photos) profile.photos = [{ value: profile.image.url }];

					err = env.validate('profile', profile, { removeAdditional: true });

					if (!err) {
						_context.next = 21;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 21:

					// TODO: right now we aren't verifying any of the JWT's assertions! We need to get Google's public
					// keys from https://www.googleapis.com/oauth2/v1/certs (because they change every day or so) and
					// use them to check the JWT's signature. What we're doing here isn't exactly best practice, but the
					// verification step isn't necessary because we just received the token directly (and securely) from
					// Google.

					// decode the JWT
					details = _jsonwebtoken2.default.decode(response.id_token);
					_context.prev = 22;
					_context.next = 25;
					return regeneratorRuntime.awrap(_Credential2.default.update(this.conn, [this.authority.id, details.sub], {
						details: details,
						profile: profile
					}));

				case 25:
					credential = _context.sent;
					_context.next = 28;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, credential.user_id));

				case 28:
					user = _context.sent;
					_context.next = 35;
					break;

				case 31:
					_context.prev = 31;
					_context.t4 = _context['catch'](22);

					if (_context.t4 instanceof errors.NotFoundError) {
						_context.next = 35;
						break;
					}

					throw _context.t4;

				case 35:
					if (!(!credential && this.authority.details.email_authority_id && details.email && details.email_verified)) {
						_context.next = 56;
						break;
					}

					_context.prev = 36;
					_context.next = 39;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.details.email_authority_id, details.email]));

				case 39:
					email_credential = _context.sent;
					_context.next = 42;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, email_credential.user_id));

				case 42:
					user = _context.sent;
					_context.next = 45;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, details.sub],
						user_id: email_credential.user_id,
						details: details,
						profile: profile
					}));

				case 45:
					credential = _context.sent;

					// assign the user to all configured roles
					assignments = {};
					assignments[user.id] = true;
					_context.next = 50;
					return regeneratorRuntime.awrap(Promise.all(this.authority.details.role_ids.map(function (id) {
						return _Role2.default.update(_this.conn, id, {
							assignments: assignments
						});
					})));

				case 50:
					_context.next = 56;
					break;

				case 52:
					_context.prev = 52;
					_context.t5 = _context['catch'](36);

					if (_context.t5 instanceof errors.NotFoundError) {
						_context.next = 56;
						break;
					}

					throw _context.t5;

				case 56:
					if (credential) {
						_context.next = 74;
						break;
					}

					if (!Array.isArray(this.authority.details.email_domains)) {
						_context.next = 61;
						break;
					}

					parts = details.email.split('@');

					if (!(this.authority.details.email_domains.indexOf(parts[parts.length - 1]) === -1)) {
						_context.next = 61;
						break;
					}

					throw new errors.AuthenticationError('The email domain "' + parts[parts.length - 1] + '" is not allowed.');

				case 61:
					_context.next = 63;
					return regeneratorRuntime.awrap(_User2.default.create(this.conn, {
						type: 'human',
						profile: without(profile, 'id')
					}));

				case 63:
					user = _context.sent;
					_context.next = 66;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, details.sub],
						user_id: user.id,
						details: details,
						profile: profile
					}));

				case 66:
					credential = _context.sent;

					if (!this.authority.details.email_authority_id) {
						_context.next = 70;
						break;
					}

					_context.next = 70;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.details.email_authority_id, details.email],
						user_id: user.id,
						profile: null
					}));

				case 70:

					// assign the user to all configured roles
					assignments = {};
					assignments[user.id] = true;
					_context.next = 74;
					return regeneratorRuntime.awrap(Promise.all(this.authority.details.role_ids.map(function (id) {
						return _Role2.default.update(_this.conn, id, {
							assignments: assignments
						});
					})));

				case 74:
					return _context.abrupt('return', user);

				case 77:

					// store the url in a cookie
					ctx.cookies.set('AuthX/session/' + this.authority.id + '/url', ctx.query.url);

					// store the state in a cookie
					state = _crypto2.default.randomBytes(32).toString('base64');

					ctx.cookies.set('AuthX/session/' + this.authority.id + '/state', state);

					// redirect the user to the authorization provider
					ctx.redirect('https://accounts.google.com/o/oauth2/auth?' + _querystring2.default.stringify({
						client_id: this.authority.details.client_id,
						redirect_uri: ctx.request.protocol + '://' + ctx.request.host + ctx.request.path,
						response_type: 'code',
						scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
						state: state
					}));

				case 81:
				case 'end':
					return _context.stop();
			}
		}, null, this, [[22, 31], [36, 52]]);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		var err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:

					// validate data
					err = env.validate('authority', data, { useDefault: true });

					if (!err) {
						_context2.next = 3;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 3:
					return _context2.abrupt('return', _Strategy2.default.createCredential.call(this, conn, data));

				case 4:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:

					// validate data
					err = env.validate('authority', delta, { useDefault: true });

					if (!err) {
						_context3.next = 3;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 3:
					return _context3.abrupt('return', _Strategy2.default.updateCredential.call(this, authority, delta));

				case 4:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		var err;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:

					// validate data
					err = env.validate('credential', data, { useDefault: true });

					if (!err) {
						_context4.next = 3;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 3:
					return _context4.abrupt('return', _Strategy2.default.prototype.createCredential.call(this, data));

				case 4:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		var err;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:

					// validate data
					err = env.validate('credential', delta, { useDefault: true });

					if (!err) {
						_context5.next = 3;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 3:
					return _context5.abrupt('return', _Strategy2.default.prototype.updateCredential.call(this, credential, delta));

				case 4:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

}
exports.default = OAuth2Strategy;
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _basicAuth = require('basic-auth');

var _basicAuth2 = _interopRequireDefault(_basicAuth);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _bcrypt = require('../util/bcrypt');

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Strategy = require('../Strategy');

var _Strategy2 = _interopRequireDefault(_Strategy);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		rounds: {
			type: 'number',
			title: 'BCrypt Rounds',
			description: 'BCrypt encryption rounds for new passwords; old passwords will continue to use their original number of rounds.',
			default: 4
		}
	}
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {
		password: {
			type: 'string',
			title: 'Password',
			description: 'The user\'s password, sent as plain text; stored as a bcrypt hash.'
		}
	}
});

class PasswordStrategy extends _Strategy2.default {

	authenticate(ctx) {
		var request, basic, credential_id, password, user_id, credential, _ref, _ref2, user;

		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					ctx.redirect_to = ctx.query.url;

					if (!(ctx.method === 'POST' && ctx.is('application/json'))) {
						_context.next = 7;
						break;
					}

					_context.next = 4;
					return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

				case 4:
					request = _context.sent;
					_context.next = 15;
					break;

				case 7:
					if (!(ctx.method === 'POST' && ctx.is('application/x-www-form-urlencoded'))) {
						_context.next = 13;
						break;
					}

					_context.next = 10;
					return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

				case 10:
					request = _context.sent;
					_context.next = 15;
					break;

				case 13:
					basic = (0, _basicAuth2.default)(ctx.req);

					if (basic) try {
						request = {
							username: JSON.parse(basic.name),
							password: basic.pass
						};
					} catch (err) {
						ctx.throw(400, 'The HTTP basic `username` must be a JSON-encoded array in the format: ["authority","authority_user_id"].');
					}

				case 15:

					// send authenticate headers
					if (!request) {
						ctx.set('WWW-Authenticate', 'Basic realm="' + ctx.app.config.realm + '"');
						ctx.throw(401, 'HTTP Basic credentials are required.');
					}

					// validate the credential_id
					credential_id = request.username;

					if (!Array.isArray(credential_id) || credential_id.length !== 2 || !credential_id.every(function (s) {
						return typeof s === 'string';
					})) ctx.throw(400, 'The `username` must be an array in the format: ["authority","authority_user_id"].');

					// validate the password
					password = request.password;

					if (!password) ctx.throw(400, 'The HTTP basic `password` must be specified.');

					// get the user ID

					if (!(credential_id[0] === this.authority.id)) {
						_context.next = 24;
						break;
					}

					_context.t0 = credential_id[1];
					_context.next = 27;
					break;

				case 24:
					_context.next = 26;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, credential_id));

				case 26:
					_context.t0 = _context.sent.user_id;

				case 27:
					user_id = _context.t0;
					_context.next = 30;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, user_id]));

				case 30:
					credential = _context.sent;
					_context.next = 33;
					return regeneratorRuntime.awrap((0, _bcrypt.compare)(password, credential.details.hash));

				case 33:
					if (_context.sent) {
						_context.next = 36;
						break;
					}

					ctx.set('WWW-Authenticate', 'Basic realm="authx"');
					ctx.throw(401, 'Incorrect password.');

				case 36:
					_context.next = 38;
					return regeneratorRuntime.awrap(Promise.all([

					// get the user
					_User2.default.get(this.conn, user_id),

					// update the credential's last_used timestamp
					credential.update({ last_used: Date.now() / 1000 })]));

				case 38:
					_ref = _context.sent;
					_ref2 = _slicedToArray(_ref, 1);
					user = _ref2[0];

					// return the user

					return _context.abrupt('return', user);

				case 42:
				case 'end':
					return _context.stop();
			}
		}, null, this);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		var err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:

					// validate data
					err = env.validate('authority', data, { useDefault: true });

					if (!err) {
						_context2.next = 3;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 3:
					return _context2.abrupt('return', _Strategy2.default.createCredential.call(this, conn, data));

				case 4:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:

					// validate data
					err = env.validate('authority', delta, { useDefault: true });

					if (!err) {
						_context3.next = 3;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 3:
					return _context3.abrupt('return', _Strategy2.default.updateCredential.call(this, authority, delta));

				case 4:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		var err;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:

					// validate data
					err = env.validate('credential', data, { useDefault: true });

					if (!err) {
						_context4.next = 3;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 3:
					return _context4.abrupt('return', _Strategy2.default.prototype.createCredential.call(this, data));

				case 4:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		var err;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:

					// validate data
					err = env.validate('credential', delta, { useDefault: true });

					if (!err) {
						_context5.next = 3;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 3:
					return _context5.abrupt('return', _Strategy2.default.prototype.updateCredential.call(this, credential, delta));

				case 4:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

}
exports.default = PasswordStrategy;
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

var hash = exports.hash = function _callee2(a, b) {
	return regeneratorRuntime.async(function _callee2$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				return _context2.abrupt('return', new Promise(function (resolve, reject) {
					return _bcrypt2.default.hash(a, b, function (err, res) {
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
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _rawBody = require('raw-body');

var _rawBody2 = _interopRequireDefault(_rawBody);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function form(req) {
	var data;
	return regeneratorRuntime.async(function form$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				_context.prev = 0;
				_context.next = 3;
				return regeneratorRuntime.awrap((0, _rawBody2.default)(req, { encoding: 'utf8' }));

			case 3:
				data = _context.sent;
				return _context.abrupt('return', _querystring2.default.parse(data));

			case 7:
				_context.prev = 7;
				_context.t0 = _context['catch'](0);
				throw new errors.ValidationError('The request body was invalid form data.');

			case 10:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[0, 7]]);
};
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
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = mailer;

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function mailer(config) {

	// stub out a transporter if none is specified
	var transport = config.transport ? _nodemailer2.default.createTransport(config.transport) : { sendMail: function (message, cb) {
			console.warn('Email transport is not set up; message not sent:', message);
			cb(null, message);
		} };

	// wrap nodemailer in a promise
	return function (message) {
		return new Promise(function (resolve, reject) {
			message = Object.assign({}, config.defaults, message);
			transport.sendMail(message, function (err, res) {
				if (err) return reject(err);
				return resolve(res);
			});
		});
	};
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _genericPool = require('generic-pool');

var _genericPool2 = _interopRequireDefault(_genericPool);

var _rethinkdb = require('rethinkdb');

var _rethinkdb2 = _interopRequireDefault(_rethinkdb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Pool {

	constructor(options, max, min, idleTimeoutMillis) {
		this.pool = _genericPool2.default.Pool({
			name: 'rethinkdb',
			create: function (callback) {
				return _rethinkdb2.default.connect(options, callback);
			},
			destroy: function (connection) {
				return connection.close();
			},
			log: false,
			min: min || 2,
			max: max || 10,
			idleTimeoutMillis: idleTimeoutMillis || 30000
		});
	}

	acquire() {
		var _this = this;

		return new Promise(function (resolve, reject) {
			return _this.pool.acquire(function (err, conn) {
				if (err) return reject(err);
				conn.release = function () {
					return _this.pool.release(conn);
				};
				resolve(conn);
			});
		});
	}

}
exports.default = Pool;
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.can = can;
exports.protect = protect;

var _scopes = require('./scopes');

var scopes = _interopRequireWildcard(_scopes);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function can(ctx, scope, strict) {
	return regeneratorRuntime.async(function can$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				if (!ctx.bearer) {
					_context.next = 5;
					break;
				}

				if (!(ctx.bearer.type === 'access_token' && ctx.bearer.scopes && ctx.bearer.scopes.some(function (s) {
					return scopes.can(s, scope, strict);
				}))) {
					_context.next = 3;
					break;
				}

				return _context.abrupt('return', true);

			case 3:
				_context.next = 12;
				break;

			case 5:
				_context.t0 = ctx.user;

				if (!_context.t0) {
					_context.next = 10;
					break;
				}

				_context.next = 9;
				return regeneratorRuntime.awrap(ctx.user.can(scope, strict));

			case 9:
				_context.t0 = _context.sent;

			case 10:
				if (!_context.t0) {
					_context.next = 12;
					break;
				}

				return _context.abrupt('return', true);

			case 12:
				return _context.abrupt('return', false);

			case 13:
			case 'end':
				return _context.stop();
		}
	}, null, this);
}

function protect(ctx, scope, strict) {
	return regeneratorRuntime.async(function protect$(_context2) {
		while (1) switch (_context2.prev = _context2.next) {
			case 0:
				_context2.next = 2;
				return regeneratorRuntime.awrap(can(ctx, scope, strict));

			case 2:
				if (!_context2.sent) {
					_context2.next = 4;
					break;
				}

				return _context2.abrupt('return');

			case 4:
				throw new errors.ForbiddenError('You lack permission for the required scope "' + scope + '".');

			case 5:
			case 'end':
				return _context2.stop();
		}
	}, null, this);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.parseIncludes = parseIncludes;
exports.parseRoles = parseRoles;

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function parseIncludes(includable, ctx) {
	if (!ctx.query.include) return null;

	// parse the query parameters
	var includes;
	try {
		includes = JSON.parse(ctx.query.include);
	} catch (err) {
		throw new errors.ValidationError('The `include` query parameter was not valid json.');
	}

	if (!Array.isArray(includes)) throw new errors.ValidationError('The json-encoded `include` query parameter was not an array.');

	includes.forEach(function (i) {
		if (typeof i !== 'string') throw new errors.ValidationError('The json-encoded `include` query parameter included a non-string value in its array.');

		if (includable.indexOf(i) === -1) throw new errors.ValidationError('The `include` query parameter contained the invalid value, "' + i + '".');
	});

	return includes;
}

function parseRoles(ctx) {
	if (!ctx.query.role_ids) return null;

	// parse the query parameters
	var role_ids;
	try {
		role_ids = JSON.parse(ctx.query.role_ids);
	} catch (err) {
		throw new errors.ValidationError('The `role_ids` query parameter was not valid json.');
	}

	if (!Array.isArray(role_ids)) throw new errors.ValidationError('The json-encoded `role_ids` query parameter was not an array.');

	role_ids.forEach(function (i) {
		if (typeof i !== 'string') throw new errors.ValidationError('The json-encoded `role_ids` query parameter included a non-string value in its array.');
	});

	return role_ids;
}
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
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.validate = validate;
exports.normalize = normalize;
exports.combine = combine;
exports.simplifyCollection = simplifyCollection;
exports.combineCollections = combineCollections;
exports.can = can;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function makeRegExp(scope) {
	var pattern = scope.split(':').map(function (domain) {
		return domain.split('.').map(function (part) {
			if (part === '**') return '([^:]*)';
			if (part === '*') return '(\\*|[^\\.^:^*]*)';
			return part.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
		}).join('\\.');
	}).join(':');

	return new RegExp('^' + pattern + '$');
}

function validate(scope) {
	return (/^(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)$/.test(scope)
	);
}

function normalize(scope) {
	return scope.split(':').map(function (domain) {
		return domain.split('.').map(function (part, i, parts) {
			if (part !== '**' || parts[i + 1] !== '**' && parts[i + 1] !== '*') return part;
			parts[i + 1] = '**';
			return '*';
		}).join('.');
	}).join(':');
}

// combines scopes `a` and `b`, returning the most permissive common scope or `null`
function combine(a, b) {
	a = normalize(a);
	b = normalize(b);

	// literal equal
	if (a == b) return a;

	var aX = makeRegExp(a);
	var bX = makeRegExp(b);

	var a_b = aX.test(b);
	var b_a = bX.test(a);

	// a supercedes b
	if (b_a && !a_b) return a;

	// b supercedes a
	if (a_b && !b_a) return b;

	// ...the scopes are thus mutually exclusive (because they cannot be mutually inclusive without being equal)

	// if there are no wildcard sequences, then there is no possibility of a combination
	if (!a.includes('*') || !b.includes('*')) return null;

	// ...substitute the wildcard matches from A into the the wildcards of B

	// loop through each domain
	var substitution = [];
	var wildcardMap = [];
	var pattern = '^' + a.split(':').map(function (domain, d) {
		return domain.split('.').map(function (part, p) {
			substitution[d] = substitution[d] || [];
			substitution[d][p] = part;

			if (part === '**') {
				wildcardMap.push({ w: '**', d: d, p: p });
				return '([^:]*)';
			}

			if (part === '*') {
				wildcardMap.push({ w: '*', d: d, p: p });
				return '([^\\.^:]*)';
			}

			return '[^:^.]*';
		}).join('\\.');
	}).join(':') + '$';

	var matches = b.match(pattern);

	// substitution failed, the scopes are incompatible
	if (!matches) return null;

	// make the substitutions, downgrade captured double wildcards
	wildcardMap.forEach(function (map, i) {
		substitution[map.d][map.p] = map.w === '*' && matches[i + 1] === '**' ? '*' : matches[i + 1];
	});

	// the combined result
	var combined = substitution.map(function (d) {
		return d.join('.');
	}).join(':');

	// test the substitution
	if (bX.test(combined)) return combined;

	return null;
}

// returns a de-duplified array of scope rules
function simplifyCollection(collection) {

	// scopes that cannot be represented by another scope in this collection
	var output = [];

	// scopes we've already determined can be represented by another scope in this collection
	var skip = [];
	for (let a = 0; a < collection.length; a++) {
		if (skip.indexOf(a) !== -1) continue;
		let candidate = collection[a];

		for (let b = a + 1; b < collection.length; b++) {
			if (skip.indexOf(b) !== -1) continue;
			let challenger = collection[b];

			// the challenger can be represented by the candidate
			if (candidate == challenger || can(candidate, challenger)) skip.push(b);

			// the candidate can be represented by the challenger
			else if (can(challenger, candidate)) {
					skip.push(a);
					a = b;
					candidate = challenger;
				}
		}

		// the winner
		output.push(candidate);
	}

	return output;
}

// calculates the product of scope rules or returns null
function combineCollections(collectionA, collectionB) {
	var _ref;

	return simplifyCollection((_ref = []).concat.apply(_ref, _toConsumableArray(collectionA.map(function (a) {
		return [].concat(collectionB.map(function (b) {
			return combine(a, b);
		}).filter(function (x) {
			return x;
		}));
	}))));
}

// according to the supplied rule, can the given subject be performed?
function can(rule, subject, strict) {
	strict = strict !== false;

	if (Array.isArray(rule)) return rule.some(function (r) {
		return can(r, subject, strict);
	});

	return strict ? makeRegExp(rule).test(subject) : !!combine(rule, subject);
}
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _authority = require('../../schema/authority');

var _authority2 = _interopRequireDefault(_authority);

var _client = require('../../schema/client');

var _client2 = _interopRequireDefault(_client);

var _credential = require('../../schema/credential');

var _credential2 = _interopRequireDefault(_credential);

var _grant = require('../../schema/grant');

var _grant2 = _interopRequireDefault(_grant);

var _profile = require('../../schema/profile');

var _profile2 = _interopRequireDefault(_profile);

var _role = require('../../schema/role');

var _role2 = _interopRequireDefault(_role);

var _team = require('../../schema/team');

var _team2 = _interopRequireDefault(_team);

var _user = require('../../schema/user');

var _user2 = _interopRequireDefault(_user);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

env.addSchema('authority', _authority2.default);
env.addSchema('client', _client2.default);
env.addSchema('credential', _credential2.default);
env.addSchema('grant', _grant2.default);
env.addSchema('profile', _profile2.default);
env.addSchema('role', _role2.default);
env.addSchema('team', _team2.default);
env.addSchema('user', _user2.default);

exports.default = env.validate.bind(env);
//# sourceMappingURL=authx.js.map
