const r = require('rethinkdb');
const Model = require('../Model');
const validate = require('../util/validator');
const errors = require('../errors');

const USER = Symbol('user');
const AUTHORITY = Symbol('authority');

// this is used to get around limitations of circular dependancies in commonjs
const models = {};

module.exports = class Credential extends Model {

	static get table() {
		return 'credentials';
	}



	static async create(conn, data) {
		var now = Date.now() / 1000;
		data = Object.assign({}, data, {created: now, last_updated: now});
		data.profile = data.profile ? Object.assign({}, data.profile) : null;

		// normalize the authority_user_id and profile ID
		if (data.id && data.id[1] && data.profile && typeof data.profile.id === 'undefined')
			data.profile.id = data.id[1];

		// validate data
		var err = validate('credential', data, {useDefault: true});
		if (err) throw new errors.ValidationError('A valid credential must be supplied.', err.validation);
		if (data.profile && data.profile.id !== data.id[1]) throw new errors.ValidationError('If a profile ID is present, it must match the `authority_user_id`.');

		// update the model (use super.create when babel.js supports it)
		return Model.create.call(this, conn, data);
	}



	static async save(conn, id, data) {
		var now = Date.now() / 1000;
		data = Object.assign({id: id}, data, {created: now, last_updated: now});
		data.profile = data.profile ? Object.assign({}, data.profile) : null;

		// normalize the authority_user_id and profile ID
		if (data.id && data.id[1] && data.profile && typeof data.profile.id === 'undefined')
			data.profile.id = data.id[1];

		// validate data
		var err = validate('credential', data, {useDefault: true});
		if (err) throw new errors.ValidationError('A valid credential must be supplied.', err.validation);
		if (data.profile && data.profile.id !== data.id[1]) throw new errors.ValidationError('If a profile ID is present, it must match the `authority_user_id`.');
		if (!Array.isArray(data.id) || data.id.some((v,i) => v !== id[i])) throw new Error('The supplied `id` did not match the `id` in the data.');

		// don't overwrite an existing `created` timestamp
		data.created = r.row('created').default(data.created);

		// save the model (use super.create when babel.js supports it)
		return Model.save.call(this, conn, id, data);
	}



	static async update(conn, id, data) {
		data = Object.assign({}, data, {last_updated: Date.now() / 1000});

		// validate data
		var err = validate('credential', data, {checkRequired: false});
		if (err) throw new errors.ValidationError('A valid credential must be supplied.', err.validation);

		// update the model (use super.update when babel.js supports it)
		return Model.update.call(this, conn, id, data);
	}



	async user(refresh) {

		// get the user from the database
		if (!this[USER] || refresh)
			this[USER] = models.User.get(this[Model.Symbols.CONN], this.user_id);

		return this[USER];
	}



	async authority(refresh) {

		// get the user from the database
		if (!this[AUTHORITY] || refresh)
			this[AUTHORITY] = models.Authority.get(this[Model.Symbols.CONN], this.authority_id);

		return this[AUTHORITY];
	}


	get authority_id() {
		return this.id[0];
	}

};

models.User = require('./User');
models.Authority = require('./Authority');
