#!/usr/bin/env node

'use strict';

var r = require('rethinkdb');
var fs = require('fs');
var async = require('async');


var host = 'localhost';
var database = 'AuthX';
var insertData = false;
var silent = false;

function log() {
	if (!silent) console.log.apply(console, arguments);
}

function error() {
	if (!silent) console.error.apply(console, arguments);
	process.exit(1);
}

process.argv.forEach(function(val, index, arr) {
	if (val === '--help') {
		console.log('Help:\n\n' +
			'(--help)\nShows this menu\n\n' +
			'(--host | -h) host\nThe rethinkdb instance\'s hostname\n\n' +
			'(--database | --db | -d) db\nThe name of the db to create\n\n' +
			'(--silent | -s)\nDon\'t output anything\n\n' +
			'(--fixture)\nLoad fixture data into the new database'
		);
		process.exit(0);
	}

	if (val === '--host' || val === '-h')
		host = arr[index + 1];

	if (val === '--database' || val === '--db' || val === '-d')
		database = arr[index + 1];

	if (val === '--silent' || val === '-s')
		silent = true;

	if (val === '--fixture')
		insertData = true;
});


// connect to rethinkdb
r.connect(host, function(err, conn) {
	if (err) return error(err);

	// create database
	r.dbCreate(database).run(conn, function(err, res) {
		if (err) return error(err);

		// load the fixtures
		async.map(fs.readdirSync(__dirname + '/../test/fixtures/'), function(file, done) {
			var fixture = require(__dirname + '/../test/fixtures/' + file);

			// create table
			r.db(database).tableCreate(fixture.table).run(conn, function(err, res) {
				if (err) return done(err);

				// create secondary indices
				async.map(fixture.secondary_indexes, function(index, loop) {
					var q = r.db(database).table(fixture.table);
					q.indexCreate.apply(q, index).run(conn, loop);
				}, function(err) {
					if (err) return done(err);

					// wait for indices to finish
					r.db(database).table(fixture.table).indexWait().run(conn, function(err, res) {
						if (err) return done(err);

						// no data to insert
						if (!insertData) return done();

						// insert data
						r.db(database).table(fixture.table).insert(fixture.data).run(conn, done);
					});
				});
			});
		}, function(err) {
			if (err) return error(err);

			log('Success.');
			process.exit();
		});
	});
});
