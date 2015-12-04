import * as errors from './errors';
import * as route from './util/route';
import * as scopes from './util/scopes';
import Koa from 'koa';
import mailer from './util/mailer';
import Pool from './util/pool';
import {can} from './util/protect';


// strategies
import EmailStrategy from './strategies/email';
import GoogleStrategy from './strategies/google';
import PasswordStrategy from './strategies/password';



// middleware
import bearerMiddleware from './middleware/bearer';
import corsMiddleware from './middleware/cors';
import dbMiddleware from './middleware/db';
import errorMiddleware from './middleware/error';
import userMiddleware from './middleware/user';



// controllers
import * as authorityController from './controllers/authorities';
import * as clientController from './controllers/clients';
import * as credentialController from './controllers/credentials';
import * as grantController from './controllers/grants';
import * as roleController from './controllers/roles';
import * as teamController from './controllers/teams';
import * as userController from './controllers/users';
import sessionController from './controllers/session';
import tokensController from './controllers/tokens';


export default class AuthX extends Koa {

	constructor(config, strategies) {
		super();


		// set the config
		this.config = config;
		this.keys = this.config.keys;
		this.proxy = this.config.proxy;

		this.pool = new Pool(this.config.db, this.config.db.pool.max, this.config.db.pool.min, this.config.db.pool.timeout);
		this.mail = mailer(this.config.mailer);
		this.strategies = strategies || {
			email: EmailStrategy,
			password: PasswordStrategy,
			google: GoogleStrategy
		};



		var root = this.config.root || '/';





		// Generic Middleware
		// ------------------

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

		this.use(route.use(root + 'session/:authority_id', sessionController));
		this.use(route.del(root + 'session'), async function(ctx) {
			ctx.cookies.set('session');
			ctx.status = 204;
		});






		// Tokens
		// ======
		// These endpoints are used by clients wishing to authenticate/authorize
		// a user with AuthX. They implement the OAuth 2.0 flow for "authorization
		// code" grant types.

		this.use(route.use(root + 'tokens', tokensController));






		// Can
		// ===
		// This is a convenience endpoint for clients. It validates credentials and
		// asserts that the token can access to the provided scope.

		this.use(route.get(root + 'can/:scope', async function(ctx) {

			if (!ctx.params.scope || !scopes.validate(ctx.params.scope))
				throw new errors.ValidationError();

			if (!ctx.user)
				throw new errors.AuthenticationError();

			if (!await can(ctx, ctx.params.scope, ctx.query.strict !== 'false'))
				throw new errors.ForbiddenError();

			ctx.status = 204;
		}));






		// Keys
		// ====
		// This outputs valid public keys and algorithms that can be used to verify
		// access tokens by resource servers. The first key is always the most recent.

		this.use(route.use(root + 'keys', async function(ctx) {
			ctx.body = ctx.app.config.access_token.public;
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
