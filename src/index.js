const errors = require('./errors');
const scopes = require('scopeutils');
const Router = require('koa-router');
const { can } = require('./util/protect');
const Pool = require('./util/pool');
exports = {};

const x = require('./namespace');
Object.assign(exports, { namespace: x });



// strategies
const EmailStrategy = require('./strategies/email');
const GoogleStrategy = require('./strategies/google');
const PasswordStrategy = require('./strategies/password');
const SecretStrategy = require('./strategies/secret');
const InContactStrategy = require('./strategies/incontact');
const OneLoginStrategy = require('./strategies/onelogin');
Object.assign(exports, { EmailStrategy, GoogleStrategy, PasswordStrategy, SecretStrategy, InContactStrategy, OneLoginStrategy });



// models
const Authority = require('./models/Authority');
const Client = require('./models/Client');
const Credential = require('./models/Credential');
const Grant = require('./models/Grant');
const Role = require('./models/Role');
const User = require('./models/User');
Object.assign(exports, { Authority, Client, Credential, Grant, Role, User });



// middleware
const bearerMiddleware = require('./middleware/bearer');
const corsMiddleware = require('./middleware/cors');
const dbMiddleware = require('./middleware/db');
const errorMiddleware = require('./middleware/error');
const userMiddleware = require('./middleware/user');
Object.assign(exports, { bearerMiddleware, corsMiddleware, dbMiddleware, errorMiddleware, userMiddleware });



// controllers
const authorityController = require('./controllers/authorities');
const clientController = require('./controllers/clients');
const credentialController = require('./controllers/credentials');
const grantController = require('./controllers/grants');
const roleController = require('./controllers/roles');
const userController = require('./controllers/users');
const sessionController = require('./controllers/session');
const tokensController = require('./controllers/tokens');



class AuthX extends Router {

	constructor(config, strategies) {
		super(config);


		// set the config
		this.config = config;


		// create a database pool
		this.pool = new Pool(config.db, config.db.pool.max, config.db.pool.min, config.db.pool.timeout);


		// attach the strategies
		this.strategies = strategies;





		// Middleware
		// ----------

		// return a middleware that sets up the namespace
		this.middleware = (ctx, next) => {
			ctx[x] = { authx: this };
			return next();
		};


		// add authx namespace context
		this.use(this.middleware);


		// error handling
		this.use(errorMiddleware);


		// get a database connection
		this.use(dbMiddleware);


		// add CORS header if necessary
		this.use(corsMiddleware);


		// get the current bearer token
		this.use(bearerMiddleware);


		// get the current user
		this.use(userMiddleware);






		// Session
		// =======
		// These endpoints manage the user's active session, including logging in,
		// logging out, and associating credentials.

		this.get('/session/:authority_id', sessionController);
		this.post('/session/:authority_id', sessionController);
		this.del('/session', async (ctx) => {
			ctx.cookies.set('session');
			ctx.status = 204;
		});






		// Tokens
		// ======
		// These endpoints are used by clients wishing to authenticate/authorize
		// a user with AuthX. They implement the OAuth 2.0 flow for "authorization
		// code" grant types.

		this.get('/tokens', tokensController);
		this.post('/tokens', tokensController);






		// Can
		// ===
		// This is a convenience endpoint for clients. It validates credentials and
		// asserts that the token can access to the provided scope.

		this.get('/can/:scope', async (ctx) => {

			if (!ctx.params.scope || !scopes.validate(ctx.params.scope))
				throw new errors.ValidationError();

			if (!ctx.user)
				throw new errors.AuthenticationError();

			if (!await can(ctx, ctx.params.scope, ctx.query.strict !== 'false'))
				throw new errors.ForbiddenError();

			ctx.status = 204;
		});






		// Keys
		// ====
		// This outputs valid public keys and algorithms that can be used to verify
		// access tokens by resource servers. The first key is always the most recent.

		this.get('/keys', async (ctx) => {
			ctx.body = this.config.access_token.public;
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


AuthX.namespace = x;

module.exports = Object.assign(AuthX, exports);
