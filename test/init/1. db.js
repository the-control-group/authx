'use strict';

var r = require('rethinkdb');
var fs = require('fs');
var async = require('async');



module.exports = {
	setup: function(done){
		// make a timestamped db
		var database = global.setup.config.db.db + Date.now();
		delete global.setup.config.db.db;

		// connect to rethinkdb
		r.connect(global.setup.config.db, function(err, conn) {
			if(err) return done(err);

			// create database
			r.dbCreate(database).run(conn, function(err) {
				if(err) return done(err);

				// now we can set the default database
				global.setup.config.db.db = database;

				// load the fixtures
				async.map(fs.readdirSync(__dirname + '/../../fixtures/'), function(file, done){
					var fixture = require(__dirname + '/../../fixtures/' + file);

					// create table
					r.db(database).tableCreate(fixture.table).run(conn, function(err) {
						if(err) return done(err);

						// insert data
						r.db(database).table(fixture.table).insert(fixture.data).run(conn, function(err) {
							if(err) return done(err);

							// no secondary indices to create
							if(!fixture.secondary_indexes.length)
								return done();

							// create secondary indices
							async.map(fixture.secondary_indexes, function(index, loop){
								var q = r.db(database).table(fixture.table);
								q.indexCreate.apply(q, index).run(conn, loop);
							}, function(err){
								if(err) return done(err);

								// wait for indices to finish
								r.db(database).table(fixture.table).indexWait().run(conn, done);
							});
						});
					});
				}, done);
			});

		});
	},
	teardown: function(done){
		// destroy test database
		r.connect(global.setup.config.db, function(err, conn) {
			if(err) return done(err);

			r.dbDrop(global.setup.config.db.db).run(conn, function(err) {
				if(err) return done(err);

				conn.close(done);
			});
		});
	}
};
