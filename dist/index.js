'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.userMiddleware = exports.errorMiddleware = exports.dbMiddleware = exports.corsMiddleware = exports.bearerMiddleware = exports.User = exports.Role = exports.Grant = exports.Credential = exports.Client = exports.Authority = exports.CakeStrategy = exports.InContactStrategy = exports.SecretStrategy = exports.PasswordStrategy = exports.GoogleStrategy = exports.EmailStrategy = exports.namespace = undefined;

var _errors = require('./errors');

var errors = _interopRequireWildcard(_errors);

var _scopeutils = require('scopeutils');

var scopes = _interopRequireWildcard(_scopeutils);

var _koaRouter = require('koa-router');

var _koaRouter2 = _interopRequireDefault(_koaRouter);

var _protect = require('./util/protect');

var _pool = require('./util/pool');

var _pool2 = _interopRequireDefault(_pool);

var _namespace = require('./namespace');

var _namespace2 = _interopRequireDefault(_namespace);

var _email = require('./strategies/email');

var _email2 = _interopRequireDefault(_email);

var _google = require('./strategies/google');

var _google2 = _interopRequireDefault(_google);

var _password = require('./strategies/password');

var _password2 = _interopRequireDefault(_password);

var _secret = require('./strategies/secret');

var _secret2 = _interopRequireDefault(_secret);

var _incontact = require('./strategies/incontact');

var _incontact2 = _interopRequireDefault(_incontact);

var _cake = require('./strategies/cake');

var _cake2 = _interopRequireDefault(_cake);

var _Authority = require('./models/Authority');

var _Authority2 = _interopRequireDefault(_Authority);

var _Client = require('./models/Client');

var _Client2 = _interopRequireDefault(_Client);

var _Credential = require('./models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _Grant = require('./models/Grant');

var _Grant2 = _interopRequireDefault(_Grant);

var _Role = require('./models/Role');

var _Role2 = _interopRequireDefault(_Role);

var _User = require('./models/User');

var _User2 = _interopRequireDefault(_User);

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

var _users = require('./controllers/users');

var userController = _interopRequireWildcard(_users);

var _session = require('./controllers/session');

var _session2 = _interopRequireDefault(_session);

var _tokens = require('./controllers/tokens');

var _tokens2 = _interopRequireDefault(_tokens);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

if (!global._babelPolyfill) require('babel-polyfill');

exports.namespace = _namespace2.default;

// strategies

exports.EmailStrategy = _email2.default;
exports.GoogleStrategy = _google2.default;
exports.PasswordStrategy = _password2.default;
exports.SecretStrategy = _secret2.default;
exports.InContactStrategy = _incontact2.default;
exports.CakeStrategy = _cake2.default;

// models

exports.Authority = _Authority2.default;
exports.Client = _Client2.default;
exports.Credential = _Credential2.default;
exports.Grant = _Grant2.default;
exports.Role = _Role2.default;
exports.User = _User2.default;

// middleware

exports.bearerMiddleware = _bearer2.default;
exports.corsMiddleware = _cors2.default;
exports.dbMiddleware = _db2.default;
exports.errorMiddleware = _error2.default;
exports.userMiddleware = _user2.default;

// controllers

class AuthX extends _koaRouter2.default {

	constructor(config, strategies) {
		var _this;

		_this = super(config);

		// set the config
		this.config = config;

		// create a database pool
		this.pool = new _pool2.default(config.db, config.db.pool.max, config.db.pool.min, config.db.pool.timeout);

		// attach the strategies
		this.strategies = strategies;

		// Middleware
		// ----------

		// return a middleware that sets up the namespace
		this.middleware = function (ctx, next) {
			ctx[_namespace2.default] = { authx: _this };
			return next();
		};

		// add authx namespace context
		this.use(this.middleware);

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

		this.get('/session/:authority_id', _session2.default);
		this.post('/session/:authority_id', _session2.default);
		this.del('/session', function _callee(ctx) {
			return regeneratorRuntime.async(function _callee$(_context) {
				while (1) switch (_context.prev = _context.next) {
					case 0:
						ctx.cookies.set('session');
						ctx.status = 204;

					case 2:
					case 'end':
						return _context.stop();
				}
			}, null, _this);
		});

		// Tokens
		// ======
		// These endpoints are used by clients wishing to authenticate/authorize
		// a user with AuthX. They implement the OAuth 2.0 flow for "authorization
		// code" grant types.

		this.get('/tokens', _tokens2.default);
		this.post('/tokens', _tokens2.default);

		// Can
		// ===
		// This is a convenience endpoint for clients. It validates credentials and
		// asserts that the token can access to the provided scope.

		this.get('/can/:scope', function _callee2(ctx) {
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
			}, null, _this);
		});

		// Keys
		// ====
		// This outputs valid public keys and algorithms that can be used to verify
		// access tokens by resource servers. The first key is always the most recent.

		this.get('/keys', function _callee3(ctx) {
			return regeneratorRuntime.async(function _callee3$(_context3) {
				while (1) switch (_context3.prev = _context3.next) {
					case 0:
						ctx.body = _this.config.access_token.public;

					case 1:
					case 'end':
						return _context3.stop();
				}
			}, null, _this);
		});

		// Resources
		// =========


		// Authorities
		// -----------

		this.post('/authorities', authorityController.post);
		this.get('/authorities', authorityController.query);
		this.get('/authorities/:authority_id', authorityController.get);
		this.patch('/authorities/:authority_id', authorityController.patch);
		this.del('/authorities/:authority_id', authorityController.del);

		// Clients
		// -------

		this.post('/clients', clientController.post);
		this.get('/clients', clientController.query);
		this.get('/clients/:client_id', clientController.get);
		this.patch('/clients/:client_id', clientController.patch);
		this.del('/clients/:client_id', clientController.del);

		// Credentials
		// ------------

		this.post('/credentials', credentialController.post);
		this.get('/credentials', credentialController.query);
		this.get('/credentials/:credential_id_0/:credential_id_1', credentialController.get);
		this.patch('/credentials/:credential_id_0/:credential_id_1', credentialController.patch);
		this.del('/credentials/:credential_id_0/:credential_id_1', credentialController.del);

		// Grants
		// ------

		this.post('/grants', grantController.post);
		this.get('/grants', grantController.query);
		this.get('/grants/:module_id', grantController.get);
		this.patch('/grants/:module_id', grantController.patch);
		this.del('/grants/:module_id', grantController.del);

		// Roles
		// -----

		this.post('/roles', roleController.post);
		this.get('/roles', roleController.query);
		this.get('/roles/:role_id', roleController.get);
		this.patch('/roles/:role_id', roleController.patch);
		this.del('/roles/:role_id', roleController.del);

		// Users
		// -----

		this.post('/users', userController.post);
		this.get('/users', userController.query);
		this.get('/users/:user_id', userController.get);
		this.patch('/users/:user_id', userController.patch);
		this.del('/users/:user_id', userController.del);
		this.get('/me', userController.get);
		this.patch('/me', userController.patch);
		this.del('/me', userController.del);
	}
}

exports.default = AuthX;
AuthX.namespace = _namespace2.default;