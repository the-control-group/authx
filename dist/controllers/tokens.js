'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _json = require('../util/json');

var _json2 = _interopRequireDefault(_json);

var _form = require('../util/form');

var _form2 = _interopRequireDefault(_form);

var _scopes = require('../util/scopes');

var scopes = _interopRequireWildcard(_scopes);

var _errors = require('../errors');

var errors = _interopRequireWildcard(_errors);

var _Client = require('../models/Client');

var _Client2 = _interopRequireDefault(_Client);

var _Grant = require('../models/Grant');

var _Grant2 = _interopRequireDefault(_Grant);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let scopeRegex = /^(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)$/;

exports.default = function _callee(ctx) {
	var requestedScopes, client, grant, globallyAuthorizedScopes, authorizedScopes, userAuthorizedScopes, data, nonce, code, refresh_token, user, totalScopes, access_token;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				if (!(ctx.query.response_type === 'code')) {
					_context.next = 62;
					break;
				}

				if (ctx.query.client_id) {
					_context.next = 3;
					break;
				}

				throw new errors.ValidationError('A `client_id` must be defined.');

			case 3:
				if (ctx.query.redirect_uri) {
					_context.next = 5;
					break;
				}

				throw new errors.ValidationError('A `redirect_uri` must be defined.');

			case 5:
				if (!(typeof ctx.query.scope === 'undefined')) {
					_context.next = 7;
					break;
				}

				throw new errors.ValidationError('A `scope` must be defined.');

			case 7:

				// parse & validate the scopes
				requestedScopes = ctx.query.scope.split(' ');

				if (requestedScopes.every(function (s) {
					return scopeRegex.test(s);
				})) {
					_context.next = 10;
					break;
				}

				throw new errors.ValidationError('The `scope` parameter must be a space-separated list of AuthX scopes.');

			case 10:
				_context.next = 12;
				return regeneratorRuntime.awrap(_Client2.default.get(ctx.conn, ctx.query.client_id));

			case 12:
				client = _context.sent;

				if (!(!ctx.session || ctx.session.sub !== ctx.user.id)) {
					_context.next = 17;
					break;
				}

				ctx.redirect(ctx.app.config.routes.login + (ctx.app.config.routes.login.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(ctx.url));
				ctx.body = { url: ctx.url };
				return _context.abrupt('return');

			case 17:

				// start with globally authorized scopes for this client
				globallyAuthorizedScopes = client.scopes;
				authorizedScopes = globallyAuthorizedScopes.slice();
				userAuthorizedScopes = [];

				// do we also need user-authorized scopes?

				if (requestedScopes.every(function (rS) {
					return authorizedScopes.some(function (aS) {
						return scopes.can(aS, rS);
					});
				})) {
					_context.next = 52;
					break;
				}

				if (!(ctx.method === 'POST')) {
					_context.next = 37;
					break;
				}

				_context.prev = 22;
				_context.next = 25;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 25:
				data = _context.sent;

				if (!(!data.scopes || !Array.isArray(data.scopes) || !data.scopes.every(function (s) {
					return typeof s === 'string' && scopeRegex.test(s);
				}))) {
					_context.next = 28;
					break;
				}

				throw new Error();

			case 28:
				_context.next = 33;
				break;

			case 30:
				_context.prev = 30;
				_context.t0 = _context['catch'](22);
				throw new errors.ValidationError('Authorized `scopes` must be a json-encoded array of scopes.');

			case 33:

				userAuthorizedScopes = data.scopes;
				authorizedScopes = scopes.simplifyCollection(authorizedScopes.concat(userAuthorizedScopes));
				_context.next = 50;
				break;

			case 37:
				_context.prev = 37;
				_context.next = 40;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, [ctx.user.id, client.id]));

			case 40:
				grant = _context.sent;

				userAuthorizedScopes = grant.scopes;
				authorizedScopes = scopes.simplifyCollection(authorizedScopes.concat(userAuthorizedScopes));
				_context.next = 50;
				break;

			case 45:
				_context.prev = 45;
				_context.t1 = _context['catch'](37);

				if (!(_context.t1 instanceof errors.NotFoundError)) {
					_context.next = 49;
					break;
				}

				return _context.abrupt('return', requestApproval(ctx));

			case 49:
				throw _context.t1;

			case 50:
				if (requestedScopes.every(function (rS) {
					return authorizedScopes.some(function (aS) {
						return scopes.can(aS, rS);
					});
				})) {
					_context.next = 52;
					break;
				}

				return _context.abrupt('return', requestApproval(ctx));

			case 52:

				// generate and store an authorization code.
				nonce = _uuid2.default.v4();
				code = new Buffer(JSON.stringify([ctx.user.id, nonce])).toString('base64');
				_context.next = 56;
				return regeneratorRuntime.awrap(_Grant2.default.save(ctx.conn, [ctx.user.id, client.id], {
					nonce: nonce,
					scopes: userAuthorizedScopes
				}));

			case 56:
				grant = _context.sent;

				// redirect the user back to the client with an authorization code.
				ctx.redirect(ctx.query.redirect_uri + (ctx.query.redirect_uri.includes('?') ? '&' : '?') + 'code=' + code + '&state=' + ctx.query.state);
				ctx.body = { code: code };
				return _context.abrupt('return');

			case 62:
				if (!(ctx.method === 'POST')) {
					_context.next = 138;
					break;
				}

				if (!ctx.is('application/json')) {
					_context.next = 69;
					break;
				}

				_context.next = 66;
				return regeneratorRuntime.awrap((0, _json2.default)(ctx.req));

			case 66:
				data = _context.sent;
				_context.next = 73;
				break;

			case 69:
				if (!ctx.is('application/x-www-form-urlencoded')) {
					_context.next = 73;
					break;
				}

				_context.next = 72;
				return regeneratorRuntime.awrap((0, _form2.default)(ctx.req));

			case 72:
				data = _context.sent;

			case 73:
				if (data.client_id) {
					_context.next = 75;
					break;
				}

				throw new errors.ValidationError('A valid `client_id` must be provided.');

			case 75:
				if (data.client_secret) {
					_context.next = 77;
					break;
				}

				throw new errors.ValidationError('A valid `client_secret` must be provided.');

			case 77:
				_context.next = 79;
				return regeneratorRuntime.awrap(_Client2.default.get(ctx.conn, data.client_id));

			case 79:
				client = _context.sent;

				if (!(client.secret !== data.client_secret)) {
					_context.next = 82;
					break;
				}

				throw new errors.ForbiddenError('The client secret was incorrect.');

			case 82:
				if (!(data.grant_type === 'authorization_code')) {
					_context.next = 100;
					break;
				}

				if (data.code) {
					_context.next = 85;
					break;
				}

				throw new errors.ValidationError('A valid `code` must be provided.');

			case 85:
				_context.prev = 85;

				code = new Buffer(data.code, 'base64').toString('utf8');
				code = JSON.parse(code);

				if (!(!Array.isArray(code) || code.length !== 2 || typeof code[0] !== 'string' || typeof code[1] !== 'string')) {
					_context.next = 90;
					break;
				}

				throw new Error();

			case 90:
				_context.next = 95;
				break;

			case 92:
				_context.prev = 92;
				_context.t2 = _context['catch'](85);
				throw new errors.ValidationError('The provided `code` is invalid.');

			case 95:
				_context.next = 97;
				return regeneratorRuntime.awrap(_Grant2.default.getWithNonce(ctx.conn, [code[0], data.client_id], code[1]));

			case 97:
				grant = _context.sent;
				_context.next = 121;
				break;

			case 100:
				if (!(data.grant_type === 'refresh_token')) {
					_context.next = 120;
					break;
				}

				if (data.refresh_token) {
					_context.next = 103;
					break;
				}

				throw new errors.ValidationError('A valid `refresh_token` must be provided.');

			case 103:
				_context.prev = 103;

				refresh_token = new Buffer(data.refresh_token, 'base64').toString('utf8');
				refresh_token = JSON.parse(refresh_token);

				if (!(!Array.isArray(refresh_token) || refresh_token.length !== 2 || typeof refresh_token[0] !== 'string' || typeof refresh_token[1] !== 'string')) {
					_context.next = 108;
					break;
				}

				throw new Error();

			case 108:
				_context.next = 113;
				break;

			case 110:
				_context.prev = 110;
				_context.t3 = _context['catch'](103);
				throw new errors.ValidationError('The provided `refresh_token` is invalid.');

			case 113:
				_context.next = 115;
				return regeneratorRuntime.awrap(_Grant2.default.get(ctx.conn, [refresh_token[0], data.client_id]));

			case 115:
				grant = _context.sent;

				if (!(grant.refresh_token !== refresh_token[1])) {
					_context.next = 118;
					break;
				}

				throw new errors.ValidationError('The provided `refresh_token` is incorrect.');

			case 118:
				_context.next = 121;
				break;

			case 120:
				throw new errors.ValidationError('The `grant_type` must be "authorization_code" or "refresh_token".');

			case 121:
				_context.next = 123;
				return regeneratorRuntime.awrap(grant.user());

			case 123:
				user = _context.sent;

				// scopes globally authorized to the client
				globallyAuthorizedScopes = client.scopes;

				// all scopes (global + user) authorized by this grant

				authorizedScopes = scopes.simplifyCollection(globallyAuthorizedScopes.concat(grant.scopes));

				// all scopes (grant x user) authorized in the token

				_context.t4 = scopes;
				_context.t5 = authorizedScopes;
				_context.next = 130;
				return regeneratorRuntime.awrap(user.scopes());

			case 130:
				_context.t6 = _context.sent;
				totalScopes = _context.t4.combineCollections.call(_context.t4, _context.t5, _context.t6);

				// generate the access token
				access_token = _jsonwebtoken2.default.sign({
					type: 'access_token',
					scopes: totalScopes
				}, ctx.app.config.access_token.private_key, {
					algorithm: ctx.app.config.access_token.algorithm,
					expiresIn: ctx.app.config.access_token.expiresIn,
					audience: grant.client_id,
					subject: grant.user_id,
					issuer: ctx.app.config.realm
				});

				// respond with tokens

				ctx.status = 200;
				ctx.body = {
					access_token: access_token,
					refresh_token: new Buffer(JSON.stringify([user.id, grant.refresh_token])).toString('base64'),
					scope: authorizedScopes
				};

				// convenience, adds the user to the response if the token has access
				if (scopes.can(totalScopes, 'AuthX:me:read')) ctx.body.user = user;

				_context.next = 139;
				break;

			case 138:
				throw new errors.ValidationError('Missing `response_type=code` query parameter or POST body.');

			case 139:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[22, 30], [37, 45], [85, 92], [103, 110]]);
};

function requestApproval(ctx) {
	var url = encodeURIComponent(ctx.url);
	var scope = encodeURIComponent(ctx.query.scope);
	ctx.redirect(ctx.app.config.routes.authorize + (ctx.app.config.routes.authorize.includes('?') ? '&' : '?') + 'url=' + url + '&scope=' + scope);
	ctx.body = { url: url, scope: scope };
}