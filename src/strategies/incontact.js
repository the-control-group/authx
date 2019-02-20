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
		app_name: {
			type: 'string',
			title: 'inContact App Name'
		},
		vendor_name: {
			type: 'string',
			title: 'inContact Vendor Name'
		},
		business_unit_number: {
			type: 'string',
			title: 'inContact Business Unit Number'
		},
		email_authority_id: {
			type: ['null', 'string'],
			title: 'Email Authority ID',
			description:
				'The ID of an email authority with which verified email addresses can be registered.',
			default: null
		},
		sync_profile_to_customer: {
			type: 'boolean',
			title: 'Sync Profile to Customer',
			default: false
		},
		teams: {
			type: 'object',
			title: 'Team/Role Map',
			description:
				"This maps inContact Team IDs to AuthX Roles. If a user's team is not in the mapped list, she will not be able to log in.",
			additionalProperties: {
				name: {
					type: 'string',
					title: 'inContact Team Name',
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
	required: ['app_name', 'vendor_name', 'business_unit_number']
});

env.addSchema({
	id: 'credential',
	type: 'object',
	properties: {
		team_id: {
			type: 'number',
			title: 'inContact Team ID',
			description: "The ID of the user's inContact team."
		},
		base_url: {
			type: 'string',
			title: 'inContact Base URL',
			description: 'The base URL to use when making API requests.'
		},
		access_token: {
			type: 'string',
			title: 'inContact Access Token'
		},
		username: {
			type: 'string',
			title: 'User Name'
		},
		email: {
			type: 'string',
			title: 'Email'
		}
	}
});

function without(o, key) {
	o = Object.assign({}, o);
	delete o[key];
	return o;
}

module.exports = class InContactStrategy extends Strategy {
	async authenticate(ctx) {
		let lastUsed = Date.now();

		function debug(message, data) {
			ctx.app.emit('debug', {
				message: message,
				class: 'InContactStrategy',
				timestamp: Date.now(),
				type: 'strategy',
				data: data
			});
		}

		if (ctx.method !== 'POST') throw new errors.ValidationError();

		var body;

		if (ctx.is('application/json')) body = await json(ctx.req);
		else if (ctx.is('application/x-www-form-urlencoded'))
			body = await form(ctx.req);
		else
			throw new errors.ValidationError(
				'The content type must be "application/json" or "application/x-www-form-urlencoded".'
			);

		if (typeof body.username !== 'string')
			throw new errors.ValidationError('A username is required');

		if (typeof body.password !== 'string')
			throw new errors.ValidationError('A password is required');

		// make a request to inContact
		var response;
		try {
			debug('Sending token request to inContact', {
				username: body.username
			});

			response = JSON.parse(
				await request({
					method: 'POST',
					uri: 'https://api.incontact.com/InContactAuthorizationServer/Token',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						Authorization:
							'Basic ' +
							new Buffer(
								this.authority.details.app_name +
									'@' +
									this.authority.details.vendor_name +
									':' +
									this.authority.details.business_unit_number
							).toString('base64')
					},
					body: JSON.stringify({
						grant_type: 'password',
						username: body.username,
						password: body.password,
						scope: 'AdminApi'
					})
				})
			);

			debug('Token received from inContact', response);
		} catch (err) {
			// inContact foolishly returns a 409 to indicate a "success" that is associated
			// with an existing session, rather than a newly created session
			if (
				err instanceof requestErrors.StatusCodeError &&
				err.statusCode === 409
			) {
				response = JSON.parse(err.response);
				debug('Token received from inContact', response);
			}

			// handle all other error codes as expected
			else {
				debug('Token request to inContact failed', err);

				if (err instanceof requestErrors.StatusCodeError) {
					if (err.statusCode === 401)
						throw new errors.AuthenticationError(
							'Incorrect username or bad password.'
						);
					if (err.statusCode === 400)
						throw new errors.ValidationError(
							'Invalid username or bad password.'
						);
				}

				throw err;
			}
		}

		debug('Sending agent request to inContact', {
			agentId: response.agent_id
		});

		// get the agent
		let agent = JSON.parse(
			await request({
				method: 'GET',
				uri:
					response.resource_server_base_uri +
					'services/v6.0/agents/' +
					response.agent_id,
				headers: {
					Accept: 'application/json',
					Authorization: 'Bearer ' + response.access_token
				}
			})
		).agents[0];

		debug('Agent received from inContact', agent);

		// normalize the profile with our schema
		let profile = {
			id: response.agent_id.toString(),
			displayName:
				agent.FirstName +
				' ' +
				(agent.MiddleName ? agent.MiddleName + ' ' : '') +
				agent.LastName,
			name: {
				givenName: agent.FirstName,
				middleName: agent.MiddleName,
				familyName: agent.LastName
			},
			emails: [{ value: agent.Email }]
		};

		// build the details
		let details = {
			agent_id: response.agent_id,
			team_id: response.team_id,
			base_url: response.resource_server_base_uri,
			access_token: response.access_token,
			username: agent.UserName,
			email: agent.Email
		};

		// check that the team has been mapped
		if (!this.authority.details.teams[details.team_id])
			throw new errors.AuthenticationError(
				'The team #' + details.team_id + ' is not configured.'
			);

		let credential, user;

		// look for an existing credential by ID
		try {
			debug('Checking for an existing credential by ID', {
				authorityId: this.authority.id,
				agentId: details.agent_id.toString()
			});

			credential = await Credential.get(this.conn, [
				this.authority.id,
				details.agent_id.toString()
			]);

			// detect a change in team
			if (details.team_id !== credential.details.team_id) {
				let oldRoleIds = this.authority.details.teams[
					credential.details.team_id
				].role_ids;
				let newRoleIds = this.authority.details.teams[details.team_id].role_ids;

				debug('Team has changed; changing roles accordingly.', {
					oldRoleIds: oldRoleIds,
					newRoleIds: newRoleIds
				});

				// remove any roles that aren't shared between the old and new teams
				await oldRoleIds
					.filter(id => newRoleIds.indexOf(id) === -1)
					.map(id =>
						Role.update(this.conn, id, {
							assignments: {
								[credential.user_id]: false
							}
						})
					);
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
				debug("Syncing the user's profile.", {
					userId: credential.user_id,
					profile: profile
				});

				user = await User.update(this.conn, credential.user_id, {
					profile: profile
				});
			} else {
				debug('Fetching the user by ID.', {
					userId: credential.user_id
				});

				user = await User.get(this.conn, credential.user_id);
			}
		} catch (err) {
			if (!(err instanceof errors.NotFoundError)) throw err;
		}

		// lookup customer by email
		if (
			!credential &&
			this.authority.details.email_authority_id &&
			details.email
		)
			try {
				debug('Fetching the user by email.', {
					authorityId: this.authority.details.email_authority_id,
					email: details.email
				});

				let email_credential = await Credential.get(this.conn, [
					this.authority.details.email_authority_id,
					details.email
				]);
				user = await User.get(this.conn, email_credential.user_id);

				debug('Creating a new credential.', {
					authorityId: this.authority.id,
					agentId: details.agent_id,
					userId: email_credential.user_id,
					details: details,
					profile: profile
				});

				// create a new credential
				credential = await Credential.create(this.conn, {
					id: [this.authority.id, details.agent_id.toString()],
					user_id: email_credential.user_id,
					details: details,
					profile: profile
				});
			} catch (err) {
				if (!(err instanceof errors.NotFoundError)) throw err;
			}

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
				agentId: details.agent_id,
				userId: user.id,
				lastUsed: lastUsed,
				details: details,
				profile: profile
			});

			// create a new credential
			credential = await Credential.create(this.conn, {
				id: [this.authority.id, details.agent_id.toString()],
				user_id: user.id,
				last_used: lastUsed,
				details: details,
				profile: profile
			});

			// create a new email credential
			if (this.authority.details.email_authority_id) {
				debug('Creating a new email credential.', {
					authorityId: this.authority.details.email_authority_id,
					email: details.email,
					userId: user.id,
					lastUsed: lastUsed,
					details: details,
					profile: profile
				});

				await Credential.create(this.conn, {
					id: [this.authority.details.email_authority_id, details.email],
					user_id: user.id,
					last_used: lastUsed,
					profile: null
				});
			}
		}

		// assign the user to all configured roles
		try {
			debug('Assigning the user to configured roles.', {
				roleIds: this.authority.details.teams[details.team_id].role_ids
			});

			let assignments = {};
			assignments[user.id] = true;
			await Promise.all(
				this.authority.details.teams[details.team_id].role_ids.map(id =>
					Role.update(this.conn, id, {
						assignments: assignments
					})
				)
			);
		} catch (err) {
			throw new errors.ServerError(
				'Unable to assign roles for team #' + details.team_id + '.'
			);
		}

		return user;
	}

	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('authority', data.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The authority details were invalid.',
				err.validation
			);

		return Strategy.createAuthority.call(this, conn, data);
	}

	static async updateAuthority(authority, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('authority', delta.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The authority details were invalid.',
				err.validation
			);

		return Strategy.updateAuthority.call(this, authority, delta);
	}

	// Credential Methods
	// ------------------

	async createCredential(data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate('credential', data.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The credential details were invalid.',
				err.validation
			);

		return Strategy.prototype.createCredential.call(this, data);
	}

	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate('credential', delta.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				'The credential details were invalid.',
				err.validation
			);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}
};
