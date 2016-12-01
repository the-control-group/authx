const jjv = require('jjv');
const form = require('../util/form');
const json = require('../util/json');
const request = require('request-promise');
const requestErrors = require('request-promise/errors');
const errors = require('../errors');

const Strategy = require('../Strategy');
const Credential = require('../models/Credential');
const Role = require('../models/Role');
const User = require('../models/User');

var env = jjv();

env.addSchema({
	id: 'authority',
	type: 'object',
	properties: {
		hostname: {
			type: 'string',
			title: 'Cake Instance Hostname'
		},
		sync_profile_to_customer: {
			type: 'boolean',
			title: 'Sync Profile to Customer',
			default: false
		},
		roles: {
			type: 'object',
			title: 'Cake/AuthX Role Map',
			description: 'This maps Cake Role IDs to AuthX Roles. If a user\'s role is not in the mapped list, she will not be able to log in.',
			additionalProperties: {
				name: {
					type: 'string',
					title: 'Cake Role Name',
					default: ''
				},
				role_ids: {
					type: 'array',
					title: 'AuthX Role IDs',
					default: []
				}
			},
			default: {}
		}
	},
	required: [
		'hostname'
	]
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {
		role_id: {
			type: 'number',
			title: 'Cake Role ID',
			description: 'The ID of the user\'s Cake role.'
		},
		company_id: {
			type: 'number',
			title: 'Company ID'
		},
		company_name: {
			type: 'string',
			title: 'Company Name'
		},
		api_key: {
			type: 'string',
			title: 'API Key'
		}
	}
});

function without(o, key) {
	o = Object.assign({}, o);
	delete o[key];
	return o;
}

module.exports = class CakeStrategy extends Strategy {

	async authenticate(ctx) {
		let lastUsed = Date.now();


		function debug(message, data) {
			ctx.app.emit('debug', {
				message: message,
				class: 'CakeStrategy',
				timestamp: Date.now(),
				type: 'strategy',
				data: data
			});
		}


		if (ctx.method !== 'POST')
			throw new errors.ValidationError();



		var body;

		if (ctx.is('application/json'))
			body = await json(ctx.req);

		else if (ctx.is('application/x-www-form-urlencoded'))
			body = await form(ctx.req);

		else
			throw new errors.ValidationError('The content type must be "application/json" or "application/x-www-form-urlencoded".');



		if (typeof body.username !== 'string')
			throw new errors.ValidationError('A username is required');

		if (typeof body.password !== 'string')
			throw new errors.ValidationError('A password is required');


		// make a request to Cake
		var response;
		try {

			debug('Sending token request to Cake', {
				username: body.username
			});

			response = JSON.parse(await request({
				method: 'POST',
				uri: `https://${this.authority.details.hostname}/api/2/auth.asmx/Login`,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: body.username,
					password: body.password,
					ip_address: ctx.ip
				})
			}));

			debug('Response received from Cake', response);

		} catch (err) {

			debug('Request to Cake failed', err);

			if (err instanceof requestErrors.StatusCodeError) {
				if (err.statusCode === 401) throw new errors.AuthenticationError('Incorrect username or bad password.');
				if (err.statusCode === 400) throw new errors.ValidationError('Invalid username or bad password.');
			}

			throw err;
		}

		if (!response.d)
			throw new Error('Cake returned with an invalid response.');

		if (!response.d.success) {
			if (response.d.message === 'Invalid username and/or password') throw new errors.AuthenticationError('Incorrect username or bad password.');
			if (response.d.message) throw new errors.ValidationError(response.d.message);
			throw new Error('Cake returned with an unknown error.');
		}


		const info = response.d.login_info;


		// normalize the profile with our schema
		let profile = {
			id: info.contact_id.toString(),
			displayName: info.contact_first_name + ' ' + info.contact_last_name,
			name: {
				givenName: info.contact_first_name,
				familyName: info.contact_last_name
			}
		};


		// build the details
		let details = {
			role_id: info.role_id,
			company_id: info.company_id,
			company_name: info.company_name,
			api_key: info.api_key
		};


		// check that the role has been mapped
		if(!this.authority.details.roles[details.role_id])
			throw new errors.AuthenticationError('The role #' + details.role_id + ' is not configured.');


		let credential, user;


		// look for an existing credential by ID
		try {

			debug('Checking for an existing credential by ID', {
				authorityId: this.authority.id,
				agentId: info.contact_id.toString()
			});

			credential = await Credential.get(this.conn, [this.authority.id, info.contact_id.toString()]);

			// detect a change in role
			if (details.role_id !== credential.details.role_id) {

				let oldRoleIds = this.authority.details.roles[credential.details.role_id].role_ids;
				let newRoleIds = this.authority.details.roles[details.role_id].role_ids;

				debug('Role has changed; changing roles accordingly.', {
					oldRoleIds: oldRoleIds,
					newRoleIds: newRoleIds
				});

				// remove any roles that aren't shared between the old and new roles
				await oldRoleIds
					.filter(id => newRoleIds.indexOf(id) === -1)
					.map(id => Role.update(this.conn, id, {assignments: {
						[credential.user_id]: false
					}}));
			}

			debug('Updating the credential.', {
				details: details,
				profile: profile,
				lastUsed: lastUsed
			});

			// update the credential
			credential = await credential.update({
				details: details,
				profile: profile,
				last_used: lastUsed
			});


			// sync the user's profile
			if (this.authority.details.sync_profile_to_customer) {

				debug('Syncing the user\'s profile.', {
					userId: credential.user_id,
					profile: profile
				});

				user = await User.update(this.conn, credential.user_id, {profile: profile});
			} else {

				debug('Fetching the user by ID.', {
					userId: credential.user_id
				});

				user = await User.get(this.conn, credential.user_id);
			}


		} catch (err) { if (!(err instanceof errors.NotFoundError)) throw err; }



		// create a brand-new user
		if (!credential) {

			debug('Creating a new user.', {
				type: 'human',
				profile: without(profile, 'id')
			});

			// create a new user account
			user = await User.create(this.conn, {
				type: 'human',
				profile: without(profile, 'id')
			});

			debug('Creating a new credential.', {
				authorityId: this.authority.id,
				contactId: info.contact_id,
				userId: user.id,
				lastUsed: lastUsed,
				details: details,
				profile: profile
			});

			// create a new credential
			credential = await Credential.create(this.conn, {
				id: [this.authority.id, info.contact_id.toString()],
				user_id: user.id,
				last_used: lastUsed,
				details: details,
				profile: profile
			});

		}

		// assign the user to all configured roles
		try {

			debug('Assigning the user to configured roles.', {
				roleIds: this.authority.details.roles[details.role_id].role_ids
			});

			let assignments = {}; assignments[user.id] = true;
			await Promise.all(this.authority.details.roles[details.role_id].role_ids.map(id => Role.update(this.conn, id, {
				assignments: assignments
			})));
		} catch (err) {
			throw new errors.ServerError('Unable to assign roles for role #' + details.role_id + '.');
		}

		return user;

	}



	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('authority', data.details, {useDefault: true});
		if (err) throw new errors.ValidationError('The authority details were invalid.', err.validation);

		return Strategy.createAuthority.call(this, conn, data);
	}



	static async updateAuthority(authority, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('authority', delta.details, {useDefault: true});
		if (err) throw new errors.ValidationError('The authority details were invalid.', err.validation);

		return Strategy.updateAuthority.call(this, authority, delta);
	}



	// Credential Methods
	// ------------------

	async createCredential(data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('credential', data.details, {useDefault: true});
		if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);

		return Strategy.prototype.createCredential.call(this, data);
	}



	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('credential', delta.details, {useDefault: true});
		if (err) throw new errors.ValidationError('The credential details were invalid.', err.validation);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}

};
