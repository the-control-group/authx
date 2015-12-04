'use strict';


require('babel-core/register');


var AuthX = require('./src/index').default;
var config = require(process.argv[2] || process.env.AUTHX_CONFIG_FILE || './config').default;
var app = new AuthX(config);


// log errors - everything as JSON makes a happier you
app.on('error', (err) => {
	if (err.status && err.status < 500)
		console.log(JSON.stringify(Object.assign({level: 'info', message: err.message}, err)));
	else
		console.error(JSON.stringify(Object.assign({level: 'error', message: err.message, stack: err.stack}, err)));
});


// start listening
app.listen(config.port);
