'use strict';

var _koa = require('koa');

var _koa2 = _interopRequireDefault(_koa);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const config = require(process.argv[2] || process.env.AUTHX_CONFIG_FILE || '../config').default;

// create a Koa app
const app = new _koa2.default();
app.proxy = true;

// create a new instanciate of AuthX
const authx = new _index2.default(config, {
	email: _index.EmailStrategy,
	google: _index.GoogleStrategy,
	password: _index.PasswordStrategy,
	secret: _index.SecretStrategy,
	incontact: _index.InContactStrategy
});

// apply the AuthX routes to the app
app.use(authx.routes());

// log errors - everything as JSON makes a happier you
app.on('error', function (err) {
	if (err.status && err.status < 500) console.log(JSON.stringify(Object.assign({ level: 'info', message: err.message }, err)));else console.error(JSON.stringify(Object.assign({ level: 'error', message: err.message, stack: err.stack }, err)));
});

// start listening
app.listen(process.env.PORT || 3000);