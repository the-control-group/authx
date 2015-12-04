'use strict';

require('babel-core/register');
require('babel-polyfill');

var cluster = require('cluster').default;
var async   = require('async').default;

var config = require(process.argv[2] || process.env.AUTHX_CONFIG_FILE || './config').default;

// the master
if (config.cluster && cluster.isMaster) {
	console.log(JSON.stringify({level: 'info', message: 'Master process started with pid ' + process.pid, pid: process.pid, process_role: 'master'}));
	for (var i = 0; i < require('os').cpus().length; i++) {
		cluster.fork();
	}

	// replace a dead worker
	cluster.on('exit', handleExit);

	// respond to signals
	process.on('SIGTERM', shutdownCluster);
	process.on('SIGINT',  shutdownCluster);
	process.on('SIGHUP',  reloadCluster);
}


// the workers
else {
	console.log(JSON.stringify({level: 'info', message: 'Worker process started with pid ' + process.pid, pid: process.pid, process_role: 'worker'}));




	// ------------------------------------------------------------------
	// BEGIN AuthX

	var AuthX = require('./src/index').default;
	var app = new AuthX(config);

	// log errors
	app.on('error', (err) => {
		if (err.status && err.status < 500)
			console.log(JSON.stringify(Object.assign({level: 'info', message: err.message}, err)));
		else
			console.error(JSON.stringify(Object.assign({level: 'error', message: err.message, stack: err.stack}, err)));
	});

	// start listening
	var server = app.listen(config.port);

	// END AuthX
	// ------------------------------------------------------------------





	process.on('uncaughtException', function (err) {
		console.error(JSON.stringify({level: 'error', message: err && err.message ? err.message : 'An unknown error occurred.', stack: err && err.stack ? err.stack : null}));
		process.exit(1);
	});


	// respond to signals
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);

}



function handleExit(worker, code, signal) {

	// exit with error status code
	if (code > 0) console.error(JSON.stringify({
		level: 'error',
		message: 'Worker process ' + worker.process.pid + ' died with code ' + code +'. Restarting...',
		code: code,
		signal: signal
	}));

	// happy status code
	else console.log(JSON.stringify({
		level: 'notice',
		message: 'Worker process ' + worker.process.pid + ' died with code ' + code +'. Restarting...',
		code: code,
		signal: signal
	}));

	// fork a new process
	cluster.fork();
}


// gracefully shutdown all worker processes and exit
function shutdownCluster() {
	console.log(JSON.stringify({level: 'notice', message: 'Shutting down the cluster.', pid: process.pid, process_role: 'master'}));

	cluster.removeListener('exit', handleExit);
	async.map(Object.keys(cluster.workers), function(id, loop) {
		cluster.workers[id].on('exit', function() { loop(); });
		cluster.workers[id].kill();
	}, function(err) {
		if (err) console.error(JSON.stringify({level: 'error', message: err.message}));
		process.exit(err ? 1 : 0);
	});
}


// gracefully reload all worker processes
var reloading = false;
function reloadCluster() {
	var workers = Object.keys(cluster.workers).map(function(id) { return cluster.workers[id]; });

	// force-reload the cluster
	if (reloading) {
		console.log(JSON.stringify({level: 'warning', message: 'Force-reloading the cluster.', pid: process.pid, process_role: 'master'}));
		reloading = false;
		workers.map(function(worker) {
			worker.kill();
		});
	}

	// cracefully reload the cluster
	else {
		reloading = true;
		console.log(JSON.stringify({level: 'notice', message: 'Reloading the cluster.', pid: process.pid, process_role: 'master'}));

		// stagger the reloads so that only 1 worker is down at a time
		async.mapSeries(workers, function(worker, i, next) {
			if (!reloading) return next();

			// don't continue until a new worker starts listening
			cluster.once('listening', function() { next(); });

			// kill the old worker
			worker.kill();
		}, function() {
			reloading = false;
		});
	}

}


function shutdown() {
	console.log(JSON.stringify({level: 'notice', message: 'Shutting down worker ' + process.pid, pid: process.pid, process_role: 'worker'}));

	// attempt to close all active connections
	server.close(function(err) {
		if (err) console.error(JSON.stringify({level: 'error', message: err.message}));
		process.exit(err ? 1 : 0);
	});

	// just die after timeout
	setTimeout(function() {
		console.error(JSON.stringify({level: 'error', message: 'Graceful shutdown timeout exceeded!'}));
		process.exit(1);
	}, config.gracefulShutdownTimeout);
}
