const r = require('rethinkdb');
const uuid = require('uuid');
const Model = require('../Model');
const validate = require('../util/validator');
const errors = require('../errors');

const USER = Symbol('user');
const CLIENT = Symbol('client');

// this is used to get around limitations of circular dependancies in commonjs
const models = {};

module.exports = class Grant extends Model {

	static get table() {
		return 'grants';
	}



	static async create(conn, data) {
		var now = Date.now() / 1000;
		data = Object.assign({}, data, {created: now, last_updated: now});

		// validate data
		var err = validate('grant', data, {useDefault: true});
		if (err) throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

		// update the model (use super.create when babel.js supports it)
		return Model.create.call(this, conn, data);
	}



	static async save(conn, id, data) {
		var now = Date.now() / 1000;
		data = Object.assign({id: id}, data, {created: now, last_updated: now});

		// validate data
		var err = validate('grant', data, {useDefault: true});
		if (err) throw new errors.ValidationError('A valid grant must be supplied.', err.validation);
		if (data.id !== id) throw new Error('The supplied `id` did not match the `id` in the data.');

		// default `refresh_token` to existing one, or generate new one
		if (typeof data.refresh_token === 'undefined')
			data.refresh_token = r.row('refresh_token').default(uuid.v4());

		// don't overwrite an existing `created` timestamp
		data.created = r.row('created').default(data.created);

		// save the model (use super.create when babel.js supports it)
		return Model.save.call(this, conn, id, data);
	}



	static async update(conn, id, data) {
		data = Object.assign({}, data, {last_updated: Date.now() / 1000});

		// validate data
		var err = validate('grant', data, {checkRequired: false});
		if (err) throw new errors.ValidationError('A valid grant must be supplied.', err.validation);

		// update the model (use super.update when babel.js supports it)
		return Model.update.call(this, conn, id, data);
	}



	static async getWithNonce(conn, id, nonce) {

		// get a grant by its ID and a nonce value, and remove the nonce
		var result = await r.table(this.table).get(id).update(
			row => r.branch(row('nonce').eq(nonce), row.merge({nonce: null}), row),
			{returnChanges: 'always'}
		).run(conn);

		if(result.errors > 0)
			throw this.parseRethinkError(result.first_error);

		if(!result.replaced)
			throw new errors.NotFoundError('The requested grant does not exist, or the authorization code has already been used.');

		return new this(conn, result.changes[0].new_val);
	}



	async user(refresh) {

		// query the database for users
		if (!this[USER] || refresh)
			this[USER] = models.User.get(this[Model.Symbols.CONN], this.user_id);

		return this[USER];
	}



	async client(refresh) {

		// query the database for users
		if (!this[CLIENT] || refresh)
			this[CLIENT] = models.Client.get(this[Model.Symbols.CONN], this.client_id);

		return this[CLIENT];
	}


	get user_id() {
		return this.id[0];
	}


	get client_id() {
		return this.id[1];
	}


};

models.User = require('./User');
models.Client = require('./Client');
