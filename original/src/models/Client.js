const r = require('rethinkdb');
const Model = require('../Model');
const validate = require('../util/validator');
const errors = require('../errors');

module.exports = class Client extends Model {
	static get table() {
		return 'clients';
	}

	static async create(conn, data) {
		var now = Date.now() / 1000;
		data = Object.assign({}, data, { created: now, last_updated: now });

		// validate data
		var err = validate('client', data, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'A valid client must be supplied.',
				err.validation
			);

		// update the model (use super.create when babel.js supports it)
		return Model.create.call(this, conn, data);
	}

	static async save(conn, id, data) {
		var now = Date.now() / 1000;
		data = Object.assign({ id: id }, data, { created: now, last_updated: now });

		// validate data
		var err = validate('client', data, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'A valid client must be supplied.',
				err.validation
			);
		if (data.id !== id)
			throw new Error('The supplied `id` did not match the `id` in the data.');

		// don't overwrite an existing `created` timestamp
		data.created = r.row('created').default(data.created);

		// save the model (use super.create when babel.js supports it)
		return Model.save.call(this, conn, id, data);
	}

	static async update(conn, id, data) {
		data = Object.assign({}, data, { last_updated: Date.now() / 1000 });

		// validate data
		var err = validate('client', data, { checkRequired: false });
		if (err)
			throw new errors.ValidationError(
				'A valid client must be supplied.',
				err.validation
			);

		// update the model (use super.update when babel.js supports it)
		return Model.update.call(this, conn, id, data);
	}
};
