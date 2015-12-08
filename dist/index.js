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

if (!global._babelPolyfill) require('babel-polyfill');

// strategies

// middleware

// controllers

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