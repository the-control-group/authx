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
	required: ['hostname']
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

class CakeStrategy extends _Strategy2.default {

	authenticate(ctx) {
		var _this = this;

		var lastUsed, debug, body, response, info, profile, details, credential, user, oldRoleIds, newRoleIds, assignments;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					debug = function debug(message, data) {
						ctx.app.emit('debug', {
							message: message,
							class: 'CakeStrategy',
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


					debug('Sending token request to Cake', {
						username: body.username
					});

					_context.t0 = JSON;
					_context.next = 26;
					return regeneratorRuntime.awrap((0, _requestPromise2.default)({
						method: 'POST',
						uri: `https://${ this.authority.details.hostname }/api/2/auth.asmx/Login`,
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

				case 26:
					_context.t1 = _context.sent;
					response = _context.t0.parse.call(_context.t0, _context.t1);


					debug('Response received from Cake', response);

					_context.next = 40;
					break;

				case 31:
					_context.prev = 31;
					_context.t2 = _context['catch'](21);


					debug('Request to Cake failed', _context.t2);

					if (!(_context.t2 instanceof _errors2.default.StatusCodeError)) {
						_context.next = 39;
						break;
					}

					if (!(_context.t2.statusCode === 401)) {
						_context.next = 37;
						break;
					}

					throw new errors.AuthenticationError('Incorrect username or bad password.');

				case 37:
					if (!(_context.t2.statusCode === 400)) {
						_context.next = 39;
						break;
					}

					throw new errors.ValidationError('Invalid username or bad password.');

				case 39:
					throw _context.t2;

				case 40:
					if (response.d) {
						_context.next = 42;
						break;
					}

					throw new Error('Cake returned with an invalid response.');

				case 42:
					if (response.d.success) {
						_context.next = 48;
						break;
					}

					if (!(response.d.message === 'Invalid username and/or password')) {
						_context.next = 45;
						break;
					}

					throw new errors.AuthenticationError('Incorrect username or bad password.');

				case 45:
					if (!response.d.message) {
						_context.next = 47;
						break;
					}

					throw new errors.ValidationError(response.d.message);

				case 47:
					throw new Error('Cake returned with an unknown error.');

				case 48:
					info = response.d.login_info;

					// normalize the profile with our schema

					profile = {
						id: info.contact_id.toString(),
						displayName: info.contact_first_name + ' ' + info.contact_last_name,
						name: {
							givenName: info.contact_first_name,
							familyName: info.contact_last_name
						}
					};

					// build the details

					details = {
						role_id: info.role_id,
						company_id: info.company_id,
						company_name: info.company_name,
						api_key: info.api_key
					};

					// check that the role has been mapped

					if (this.authority.details.roles[details.role_id]) {
						_context.next = 53;
						break;
					}

					throw new errors.AuthenticationError('The role #' + details.role_id + ' is not configured.');

				case 53:
					_context.prev = 53;


					debug('Checking for an existing credential by ID', {
						authorityId: this.authority.id,
						agentId: info.contact_id.toString()
					});

					_context.next = 57;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, info.contact_id.toString()]));

				case 57:
					credential = _context.sent;

					if (!(details.role_id !== credential.details.role_id)) {
						_context.next = 64;
						break;
					}

					oldRoleIds = this.authority.details.roles[credential.details.role_id].role_ids;
					newRoleIds = this.authority.details.roles[details.role_id].role_ids;


					debug('Role has changed; changing roles accordingly.', {
						oldRoleIds: oldRoleIds,
						newRoleIds: newRoleIds
					});

					// remove any roles that aren't shared between the old and new roles
					_context.next = 64;
					return regeneratorRuntime.awrap(oldRoleIds.filter(function (id) {
						return newRoleIds.indexOf(id) === -1;
					}).map(function (id) {
						return _Role2.default.update(_this.conn, id, { assignments: {
								[credential.user_id]: false
							} });
					}));

				case 64:

					debug('Updating the credential.', {
						details: details,
						profile: profile,
						lastUsed: lastUsed
					});

					// update the credential
					_context.next = 67;
					return regeneratorRuntime.awrap(credential.update({
						details: details,
						profile: profile,
						last_used: lastUsed
					}));

				case 67:
					credential = _context.sent;

					if (!this.authority.details.sync_profile_to_customer) {
						_context.next = 75;
						break;
					}

					debug('Syncing the user\'s profile.', {
						userId: credential.user_id,
						profile: profile
					});

					_context.next = 72;
					return regeneratorRuntime.awrap(_User2.default.update(this.conn, credential.user_id, { profile: profile }));

				case 72:
					user = _context.sent;
					_context.next = 79;
					break;

				case 75:

					debug('Fetching the user by ID.', {
						userId: credential.user_id
					});

					_context.next = 78;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, credential.user_id));

				case 78:
					user = _context.sent;

				case 79:
					_context.next = 85;
					break;

				case 81:
					_context.prev = 81;
					_context.t3 = _context['catch'](53);

					if (_context.t3 instanceof errors.NotFoundError) {
						_context.next = 85;
						break;
					}

					throw _context.t3;

				case 85:
					if (credential) {
						_context.next = 94;
						break;
					}

					debug('Creating a new user.', {
						type: 'human',
						profile: without(profile, 'id')
					});

					// create a new user account
					_context.next = 89;
					return regeneratorRuntime.awrap(_User2.default.create(this.conn, {
						type: 'human',
						profile: without(profile, 'id')
					}));

				case 89:
					user = _context.sent;


					debug('Creating a new credential.', {
						authorityId: this.authority.id,
						contactId: info.contact_id,
						userId: user.id,
						lastUsed: lastUsed,
						details: details,
						profile: profile
					});

					// create a new credential
					_context.next = 93;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, info.contact_id.toString()],
						user_id: user.id,
						last_used: lastUsed,
						details: details,
						profile: profile
					}));

				case 93:
					credential = _context.sent;

				case 94:
					_context.prev = 94;


					debug('Assigning the user to configured roles.', {
						roleIds: this.authority.details.roles[details.role_id].role_ids
					});

					assignments = {};
					assignments[user.id] = true;
					_context.next = 100;
					return regeneratorRuntime.awrap(Promise.all(this.authority.details.roles[details.role_id].role_ids.map(function (id) {
						return _Role2.default.update(_this.conn, id, {
							assignments: assignments
						});
					})));

				case 100:
					_context.next = 105;
					break;

				case 102:
					_context.prev = 102;
					_context.t4 = _context['catch'](94);
					throw new errors.ServerError('Unable to assign roles for role #' + details.role_id + '.');

				case 105:
					return _context.abrupt('return', user);

				case 106:
				case 'end':
					return _context.stop();
			}
		}, null, this, [[21, 31], [53, 81], [94, 102]]);
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
exports.default = CakeStrategy;