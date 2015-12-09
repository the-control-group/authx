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

		var body, response, agent, profile, details, credential, user, oldRoleIds, newRoleIds, email_credential, assignments;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) switch (_context.prev = _context.next) {
				case 0:
					if (!(ctx.method !== 'POST')) {
						_context.next = 2;
						break;
					}

					throw new errors.ValidationError();

				case 2:
					if (!ctx.is('application/json')) {
						_context.next = 8;
						break;
					}

					_context.next = 5;
					return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

				case 5:
					body = _context.sent;
					_context.next = 15;
					break;

				case 8:
					if (!ctx.is('application/x-www-form-urlencoded')) {
						_context.next = 14;
						break;
					}

					_context.next = 11;
					return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

				case 11:
					body = _context.sent;
					_context.next = 15;
					break;

				case 14:
					throw new errors.ValidationError('The content type must be "application/json" or "application/x-www-form-urlencoded".');

				case 15:
					if (!(typeof body.username !== 'string')) {
						_context.next = 17;
						break;
					}

					throw new errors.ValidationError('A username is required');

				case 17:
					if (!(typeof body.password !== 'string')) {
						_context.next = 19;
						break;
					}

					throw new errors.ValidationError('A password is required');

				case 19:
					_context.prev = 19;
					_context.t0 = JSON;
					_context.next = 23;
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

				case 23:
					_context.t1 = _context.sent;
					response = _context.t0.parse.call(_context.t0, _context.t1);
					_context.next = 35;
					break;

				case 27:
					_context.prev = 27;
					_context.t2 = _context['catch'](19);

					if (!(_context.t2 instanceof _errors2.default.StatusCodeError)) {
						_context.next = 34;
						break;
					}

					if (!(_context.t2.statusCode === 401)) {
						_context.next = 32;
						break;
					}

					throw new errors.AuthenticationError('Incorrect username or bad password.');

				case 32:
					if (!(_context.t2.statusCode === 400)) {
						_context.next = 34;
						break;
					}

					throw new errors.ValidationError('Invalid username or bad password.');

				case 34:
					throw _context.t2;

				case 35:
					_context.t3 = JSON;
					_context.next = 38;
					return regeneratorRuntime.awrap((0, _requestPromise2.default)({
						method: 'GET',
						uri: response.resource_server_base_uri + 'services/v6.0/agents/' + response.agent_id,
						headers: {
							'Accept': 'application/json',
							'Authorization': 'Bearer ' + response.access_token
						}
					}));

				case 38:
					_context.t4 = _context.sent;
					agent = _context.t3.parse.call(_context.t3, _context.t4).agents[0];

					// normalize the profile with our schema
					profile = {
						id: response.agent_id.toString(),
						displayName: agent.FirstName + ' ' + agent.MiddleName + ' ' + agent.LastName,
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
						_context.next = 44;
						break;
					}

					throw new errors.AuthenticationError('The team #' + details.team_id + ' is not configured.');

				case 44:
					_context.prev = 44;
					_context.next = 47;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.id, details.agent_id.toString()]));

				case 47:
					credential = _context.sent;

					if (!(details.team_id !== credential.details.team_id)) {
						_context.next = 53;
						break;
					}

					oldRoleIds = this.authority.details.teams[credential.details.team_id].role_ids;
					newRoleIds = this.authority.details.teams[details.team_id].role_ids;

					// remove any roles that aren't shared between the old and new teams

					_context.next = 53;
					return regeneratorRuntime.awrap(oldRoleIds.filter(function (id) {
						return newRoleIds.indexOf(id) === -1;
					}).map(function (id) {
						return _Role2.default.update(_this.conn, id, { assignments: {
								[credential.user_id]: false
							} });
					}));

				case 53:
					_context.next = 55;
					return regeneratorRuntime.awrap(credential.update({
						details: details,
						profile: profile
					}));

				case 55:
					credential = _context.sent;
					_context.next = 58;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, credential.user_id));

				case 58:
					user = _context.sent;
					_context.next = 65;
					break;

				case 61:
					_context.prev = 61;
					_context.t5 = _context['catch'](44);

					if (_context.t5 instanceof errors.NotFoundError) {
						_context.next = 65;
						break;
					}

					throw _context.t5;

				case 65:
					if (!(!credential && this.authority.details.email_authority_id && details.email)) {
						_context.next = 82;
						break;
					}

					_context.prev = 66;
					_context.next = 69;
					return regeneratorRuntime.awrap(_Credential2.default.get(this.conn, [this.authority.details.email_authority_id, details.email]));

				case 69:
					email_credential = _context.sent;
					_context.next = 72;
					return regeneratorRuntime.awrap(_User2.default.get(this.conn, email_credential.user_id));

				case 72:
					user = _context.sent;
					_context.next = 75;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, details.agent_id.toString()],
						user_id: email_credential.user_id,
						details: details,
						profile: profile
					}));

				case 75:
					credential = _context.sent;
					_context.next = 82;
					break;

				case 78:
					_context.prev = 78;
					_context.t6 = _context['catch'](66);

					if (_context.t6 instanceof errors.NotFoundError) {
						_context.next = 82;
						break;
					}

					throw _context.t6;

				case 82:
					if (credential) {
						_context.next = 92;
						break;
					}

					_context.next = 85;
					return regeneratorRuntime.awrap(_User2.default.create(this.conn, {
						type: 'human',
						profile: without(profile, 'id')
					}));

				case 85:
					user = _context.sent;
					_context.next = 88;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.id, details.agent_id.toString()],
						user_id: user.id,
						details: details,
						profile: profile
					}));

				case 88:
					credential = _context.sent;

					if (!this.authority.details.email_authority_id) {
						_context.next = 92;
						break;
					}

					_context.next = 92;
					return regeneratorRuntime.awrap(_Credential2.default.create(this.conn, {
						id: [this.authority.details.email_authority_id, details.email],
						user_id: user.id,
						profile: null
					}));

				case 92:
					_context.prev = 92;
					assignments = {};
					assignments[user.id] = true;
					_context.next = 97;
					return regeneratorRuntime.awrap(Promise.all(this.authority.details.teams[details.team_id].role_ids.map(function (id) {
						return _Role2.default.update(_this.conn, id, {
							assignments: assignments
						});
					})));

				case 97:
					_context.next = 102;
					break;

				case 99:
					_context.prev = 99;
					_context.t7 = _context['catch'](92);
					throw new errors.ServerError('Unable to assign roles for team #' + details.team_id + '.');

				case 102:
					return _context.abrupt('return', user);

				case 103:
				case 'end':
					return _context.stop();
			}
		}, null, this, [[19, 27], [44, 61], [66, 78], [92, 99]]);
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