'use strict';

const fs = require('fs');
const async = require('async');
const config = require('./config');

function setup(done) {
	// set the test environment
	process.env.NODE_ENV = 'test';

	// don't setup twice
	if (global.setup) {
		global.setup.tests++; // increment the number of queued tests
		return done();
	}

	global.setup = {
		tests: 1 // the number of queued tests
	};

	// get test config
	global.setup.config = config;

	// automatically load all init scripts
	var files = fs.readdirSync(__dirname + '/init/');
	var scripts = [];
	files.forEach(function(file) {
		if (file.indexOf('.js') === file.length - 3) {
			var script = require(__dirname + '/init/' + file);

			if (script.setup) {
				scripts.push(script.setup);
			}
		}
	});

	// run init scripts
	return async.series(scripts, function(setupErr) {
		if (setupErr) {
			var err = { setup: setupErr };
			return teardown(function(teardownErr) {
				if (teardownErr) {
					err.teardown = teardownErr;
				}

				console.error(err);
				throw err;
			});
		}

		return done();
	});
}

function teardown(done) {
	if (!done instanceof Function) {
		done = function(err) {
			if (err) {
				throw err;
			}
		};
	}

	// decrement the number of queued tests
	global.setup.tests--;

	// don't teardown if we still have queued tests
	if (global.setup.tests) {
		return done();
	}

	// automatically load all init scripts
	fs.readdir(__dirname + '/init/', function(err, files) {
		if (err) {
			throw err;
		}

		var scripts = [];
		files.forEach(function(file) {
			if (file.indexOf('.js') === file.length - 3) {
				var script = require(__dirname + '/init/' + file);

				if (script.teardown) scripts.push(script.teardown);
			}
		});

		return async.parallel(scripts, done);
	});
}

// setup the environment
before(function(done) {
	this.timeout(60000);
	setup(done);
});

// teardown the environment
after(function(done) {
	this.timeout(60000);
	teardown(done);
});
