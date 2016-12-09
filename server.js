const path = require('path');
const Koa = require('koa');
const send = require('koa-send');
const AuthX = require('./src/index');
const { EmailStrategy, GoogleStrategy, PasswordStrategy, SecretStrategy, InContactStrategy } = AuthX;

const config = require(process.argv[2] || process.env.AUTHX_CONFIG_FILE || './config');
const root = path.join(__dirname, 'public');


// create a Koa app
const app = new Koa();
app.proxy = true;


// create a new instanciate of AuthX
const authx = new AuthX(config, {
	email: EmailStrategy,
	google: GoogleStrategy,
	password: PasswordStrategy,
	secret: SecretStrategy,
	incontact: InContactStrategy
});


// apply the AuthX routes to the app
app.use(authx.routes());


// serve reference UI
app.use(async (ctx) => {
	await send(ctx, (ctx.path || '/').replace(/^(.*)\/$/, '$1/index.html'), { root });
});


// log errors - everything as JSON makes a happier you
app.on('error', (err) => {
	if (err.status && err.status < 500)
		console.log(JSON.stringify(Object.assign({level: 'info', message: err.message}, err)));
	else
		console.error(JSON.stringify(Object.assign({level: 'error', message: err.message, stack: err.stack}, err)));
});


// start listening
app.listen(process.env.PORT || 3000);
