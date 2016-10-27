'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _jjv = require('jjv');

var _jjv2 = _interopRequireDefault(_jjv);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _errors = require('request-promise/errors');

var _errors2 = _interopRequireDefault(_errors);

var _errors3 = require('../errors');

var errors = _interopRequireWildcard(_errors3);

var _Strategy = require('../Strategy');

var _Strategy2 = _interopRequireDefault(_Strategy);

var _Credential = require('../models/Credential');

var _Credential2 = _interopRequireDefault(_Credential);

var _Role = require('../models/Role');

var _Role2 = _interopRequireDefault(_Role);

var _User = require('../models/User');

var _User2 = _interopRequireDefault(_User);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var env = (0, _jjv2.default)();

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
			description: 'The ID of an email authority with which verified email addresses can be registered.',
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
			description: 'This maps inContact Team IDs to AuthX Roles. If a user\'s team is not in the mapped list, she will not be able to log in.',
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
			description: 'The ID of the user\'s inContact team.'
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

class InContactStrategy extends _Strategy2.default {

	authenticate(ctx) {
		var _this = this;

		var lastUsed, debug, body, response, agent, profile, details, credential, user, oldRoleIds, newRoleIds, email_credential, assignments;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					debug = function debug(message, data) {
						ctx.app.emit('debug', {
							message: message,
							class: 'InContactStrategy',
							timestamp: Date.now(),
							type: 'strategy',
							data: data
						});
					};

					lastUsed = Date.now();

					if (!(ctx.method !== 'POST')) {
						_context.next = 4;
						break;
					}

					throw new errors.ValidationError();

				case 4:
					if (!ctx.is('application/json')) {
						_context.next = 10;
						break;
					}

					_context.next = 7;
					return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

				case 7:
					body = _context.sent;
					_context.next = 17;
					break;

				case 10:
					if (!ctx.is('application/x-www-form-urlencoded')) {
						_context.next = 16;
						break;
					}

					_context.next = 13;
					return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

				case 13:
					body = _context.sent;
					_context.next = 17;
					break;

				case 16:
					throw new errors.ValidationError('The content type must be "application/json" or "application/x-www-form-urlencoded".');

				case 17:
					if (!(typeof body.username !== 'string')) {
						_context.next = 19;
						break;
					}

					throw new errors.ValidationError('A username is required');

				case 19:
					if (!(typeof body.password !== 'string')) {
						_context.next = 21;
						break;
					}

					throw new errors.ValidationError('A password is required');

				case 21:
					_context.prev = 21;


					debug('Sending token request to inContact', {
						username: body.username
					});

					_context.t0 = JSON;
					_context.next = 26;
					return regeneratorRuntime.awrap((0, _requestPromise2.default)({
						method: 'POST',
						uri: 'https://api.incontact.com/InContactAuthorizationServer/Token',
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json',
							'Authorization': 'Basic ' + new Buffer(this.authority.details.app_name + '@' + this.authority.details.vendor_name + ':' + this.authority.details.business_unit_number).toString('base64')
						},
						body: JSON.stringify({
							grant_type: 'password',
							username: body.username,
							password: body.password,
							scope: 'AdminApi'
						})
					}));

				case 26:
					_context.t1 = _context.sent;
					response = _context.t0.parse.call(_context.t0, _context.t1);


					debug('Token received from inContact', response);

					_context.next = 45;
					break;

				case 31:
					_context.prev = 31;
					_context.t2 = _context['catch'](21);

					if (!(_context.t2 instanceof _errors2.default.StatusCodeError && _context.t2.statusCode === 409)) {
						_context.next = 38;
						break;
					}

					response = JSON.parse(_context.t2.response);
					debug('Token received from inContact', response);
					_context.next = 45;
					break;

				case 38:
					debug('Token request to inContact failed', _context.t2);

					if (!(_context.t2 instanceof _errors2.default.StatusCodeError)) {
						_context.next = 44;
						break;
					}

					if (!(_context.t2.statusCode === 401)) {
						_context.next = 42;
						break;
					}

					throw new errors.AuthenticationError('Incorrect username or bad password.');

				case 42:
					if (!(_context.t2.statusCode === 400)) {
						_context.next = 44;
						break;
					}

					throw new errors.ValidationError('Invalid username or bad password.');

				case 44:
					throw _context.t2;

				case 45:

					debug('Sending agent request to inContact', {
						agentId: response.agent_id
					});

					// get the agent
					_context.t3 = JSON;
					_context.next = 49;
					return regeneratorRuntime.awrap((0, _requestPromise2.default)({
						method: 'GET',
						uri: response.resource_server_base_uri + 'services/v6.0/agents/' + response.agent_id,
						headers: {
							'Accept': 'application/json',
							'Authorization': 'Bearer ' + response.access_token
						}
					}));

				case 49:
					_context.t4 = _context.sent;
					agent = _context.t3.parse.call(_context.t3, _context.t4).agents[0];


					debug('Agent received from inContact', agent);

					// normalize the profile with our schema
					profile = {
						id: response.agent_id.toString(),
						displayName: agent.FirstName + ' ' + (agent.MiddleName ? agent.MiddleName + ' ' : '') + agent.LastName,
						name: {
							givenName: agent.FirstName,
							middleName: agent.MiddleName,
							familyName: agent.LastName
						},
						emails: [{ value: agent.Email }]
					};

					// build the details

					details = {
						agent_id: response.agent_id,
						team_id: response.team_id,
						base_url: response.resource_server_base_uri,
						access_token: response.access_token,
						username: agent.UserName,
						email: agent.Email
					};

					// check that the team has been mapped

					if (this.authority.details.teams[details.team_id]) {
						_context.next = 56;
						break;
					}

					throw new errors.AuthenticationError('The team #' + details.team_id + ' is not configured.');

				case 56:
					_context.prev = 56;


					debug('Checking for an existing credential by ID', {
						authorityId: this.authority.id,
						agentId: details.agent_id.toString()
					});

					_context.next = 60;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, details.agent_id.toString()]));

				case 60:
					credential = _context.sent;

					if (!(details.team_id !== credential.details.team_id)) {
						_context.next = 67;
						break;
					}

					oldRoleIds = this.authority.details.teams[credential.details.team_id].role_ids;
					newRoleIds = this.authority.details.teams[details.team_id].role_ids;


					debug('Team has changed; changing roles accordingly.', {
						oldRoleIds: oldRoleIds,
						newRoleIds: newRoleIds
					});

					// remove any roles that aren't shared between the old and new teams
					_context.next = 67;
					return regeneratorRuntime.awrap(oldRoleIds.filter(function (id) {
						return newRoleIds.indexOf(id) === -1;
					}).map(function (id) {
						return _Role2.default.update(_this.conn, id, { assignments: {
								[credential.user_id]: false
							} });
					}));

				case 67:

					debug('Updating the credential.', {
						details: details,
						profile: profile,
						lastUsed: lastUsed
					});

					// update the credential
					_context.next = 70;
					return regeneratorRuntime.awrap(credential.update({
						details: details,
						profile: profile,
						last_used: lastUsed
					}));

				case 70:
					credential = _context.sent;

					if (!this.authority.details.sync_profile_to_customer) {
						_context.next = 78;
						break;
					}

					debug('Syncing the user\'s profile.', {
						userId: credential.user_id,
						profile: profile
					});

					_context.next = 75;
					return regeneratorRuntime.awrap(_User2.default.update(this.conn, credential.user_id, { profile: profile }));

				case 75:
					user = _context.sent;
					_context.next = 82;
					break;

				case 78:

					debug('Fetching the user by ID.', {
						userId: credential.user_id
					});

					_context.next = 81;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, credential.user_id));

				case 81:
					user = _context.sent;

				case 82:
					_context.next = 88;
					break;

				case 84:
					_context.prev = 84;
					_context.t5 = _context['catch'](56);

					if (_context.t5 instanceof errors.NotFoundError) {
						_context.next = 88;
						break;
					}

					throw _context.t5;

				case 88:
					if (!(!credential && this.authority.details.email_authority_id && details.email)) {
						_context.next = 107;
						break;
					}

					_context.prev = 89;


					debug('Fetching the user by email.', {
						authorityId: this.authority.details.email_authority_id,
						email: details.email
					});

					_context.next = 93;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.details.email_authority_id, details.email]));

				case 93:
					email_credential = _context.sent;
					_context.next = 96;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, email_credential.user_id));

				case 96:
					user = _context.sent;


					debug('Creating a new credential.', {
						authorityId: this.authority.id,
						agentId: details.agent_id,
						userId: email_credential.user_id,
						details: details,
						profile: profile
					});

					// create a new credential
					_context.next = 100;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, details.agent_id.toString()],
						user_id: email_credential.user_id,
						details: details,
						profile: profile
					}));

				case 100:
					credential = _context.sent;
					_context.next = 107;
					break;

				case 103:
					_context.prev = 103;
					_context.t6 = _context['catch'](89);

					if (_context.t6 instanceof errors.NotFoundError) {
						_context.next = 107;
						break;
					}

					throw _context.t6;

				case 107:
					if (credential) {
						_context.next = 120;
						break;
					}

					debug('Creating a new user.', {
						type: 'human',
						profile: without(profile, 'id')
					});

					// create a new user account
					_context.next = 111;
					return regeneratorRuntime.awrap(_User2.default.create(this.conn, {
						type: 'human',
						profile: without(profile, 'id')
					}));

				case 111:
					user = _context.sent;


					debug('Creating a new credential.', {
						authorityId: this.authority.id,
						agentId: details.agent_id,
						userId: user.id,
						lastUsed: lastUsed,
						details: details,
						profile: profile
					});

					// create a new credential
					_context.next = 115;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, details.agent_id.toString()],
						user_id: user.id,
						last_used: lastUsed,
						details: details,
						profile: profile
					}));

				case 115:
					credential = _context.sent;

					if (!this.authority.details.email_authority_id) {
						_context.next = 120;
						break;
					}

					debug('Creating a new email credential.', {
						authorityId: this.authority.details.email_authority_id,
						email: details.email,
						userId: user.id,
						lastUsed: lastUsed,
						details: details,
						profile: profile
					});

					_context.next = 120;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.details.email_authority_id, details.email],
						user_id: user.id,
						last_used: lastUsed,
						profile: null
					}));

				case 120:
					_context.prev = 120;


					debug('Assigning the user to configured roles.', {
						roleIds: this.authority.details.teams[details.team_id].role_ids
					});

					assignments = {};
					assignments[user.id] = true;
					_context.next = 126;
					return regeneratorRuntime.awrap(Promise.all(this.authority.details.teams[details.team_id].role_ids.map(function (id) {
						return _Role2.default.update(_this.conn, id, {
							assignments: assignments
						});
					})));

				case 126:
					_context.next = 131;
					break;

				case 128:
					_context.prev = 128;
					_context.t7 = _context['catch'](120);
					throw new errors.ServerError('Unable to assign roles for team #' + details.team_id + '.');

				case 131:
					return _context.abrupt('return', user);

				case 132:
				case 'end':
					return _context.stop();
			}
		}, null, this, [[21, 31], [56, 84], [89, 103], [120, 128]]);
	}

	// Authority Methods
	// -----------------

	static createAuthority(conn, data) {
		var err;
		return regeneratorRuntime.async(function _callee2$(_context2) {
			while (1) switch (_context2.prev = _context2.next) {
				case 0:
					data.details = data.details || {};

					// validate data
					err = env.validate('authority', data.details, { useDefault: true });

					if (!err) {
						_context2.next = 4;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 4:
					return _context2.abrupt('return', _Strategy2.default.createAuthority.call(this, conn, data));

				case 5:
				case 'end':
					return _context2.stop();
			}
		}, null, this);
	}

	static updateAuthority(authority, delta) {
		var err;
		return regeneratorRuntime.async(function _callee3$(_context3) {
			while (1) switch (_context3.prev = _context3.next) {
				case 0:
					delta.details = delta.details || {};

					// validate data
					err = env.validate('authority', delta.details, { useDefault: true });

					if (!err) {
						_context3.next = 4;
						break;
					}

					throw new errors.ValidationError('The authority details were invalid.', err.validation);

				case 4:
					return _context3.abrupt('return', _Strategy2.default.updateAuthority.call(this, authority, delta));

				case 5:
				case 'end':
					return _context3.stop();
			}
		}, null, this);
	}

	// Credential Methods
	// ------------------

	createCredential(data) {
		var err;
		return regeneratorRuntime.async(function _callee4$(_context4) {
			while (1) switch (_context4.prev = _context4.next) {
				case 0:
					data.details = data.details || {};

					// validate data
					err = env.validate('credential', data.details, { useDefault: true });

					if (!err) {
						_context4.next = 4;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 4:
					return _context4.abrupt('return', _Strategy2.default.prototype.createCredential.call(this, data));

				case 5:
				case 'end':
					return _context4.stop();
			}
		}, null, this);
	}

	updateCredential(credential, delta) {
		var err;
		return regeneratorRuntime.async(function _callee5$(_context5) {
			while (1) switch (_context5.prev = _context5.next) {
				case 0:
					delta.details = delta.details || {};

					// validate data
					err = env.validate('credential', delta.details, { useDefault: true });

					if (!err) {
						_context5.next = 4;
						break;
					}

					throw new errors.ValidationError('The credential details were invalid.', err.validation);

				case 4:
					return _context5.abrupt('return', _Strategy2.default.prototype.updateCredential.call(this, credential, delta));

				case 5:
				case 'end':
					return _context5.stop();
			}
		}, null, this);
	}

}
exports.default = InContactStrategy;