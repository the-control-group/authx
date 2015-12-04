'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _jsonwebtoken = require('jsonwebtoken');

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _Authority = require('../models/Authority');

var _Authority2 = _interopRequireDefault(_Authority);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function _callee(ctx, next) {
	var authority, Strategy, strategy, user, token, respond;
	return regeneratorRuntime.async(function _callee$(_context) {
		while (1) switch (_context.prev = _context.next) {
			case 0:
				respond = function respond() {
					if (ctx.redirect_to && (ctx.status < 300 || ctx.status >= 400)) {
						let body = ctx.body;
						let query = _querystring2.default.stringify({
							status: ctx.status,
							body: JSON.stringify(body)
						});
						ctx.redirect(ctx.redirect_to + (ctx.redirect_to.includes('?') ? '&' : '?') + query);
						ctx.body = body;
					}
				};

				ctx.status = 204;

				_context.prev = 2;
				_context.next = 5;
				return regeneratorRuntime.awrap(_Authority2.default.get(ctx.conn, ctx.params.authority_id));

			case 5:
				authority = _context.sent;

				// get the strategy
				Strategy = ctx.app.strategies[authority.strategy];

				if (Strategy) {
					_context.next = 9;
					break;
				}

				throw new Error('Strategy "' + authority.strategy + '" not implemented.');

			case 9:

				// instantiate the strategy
				strategy = new Strategy(ctx.conn, authority);

				// pass the request to the strategy

				_context.next = 12;
				return regeneratorRuntime.awrap(strategy.authenticate(ctx, next));

			case 12:
				user = _context.sent;

				if (user && user.status === 'active') {

					// generate token from user
					token = _jsonwebtoken2.default.sign({}, ctx.app.config.session_token.private_key, {
						algorithm: ctx.app.config.session_token.algorithm,
						expiresIn: ctx.app.config.session_token.expiresIn,
						audience: ctx.app.config.realm,
						subject: user.id,
						issuer: ctx.app.config.realm
					});

					// set the session cookie

					ctx.cookies.set('session', token);

					ctx.status = 200;
					ctx.body = { message: 'You have successfully logged in.' };
				}

				respond();

				_context.next = 23;
				break;

			case 17:
				_context.prev = 17;
				_context.t0 = _context['catch'](2);

				ctx.app.emit('error', _context.t0, ctx);

				// set the status
				ctx.status = _context.t0.status || 500;

				// display an error
				if (typeof _context.t0.expose === 'function') ctx.body = _context.t0.expose();else ctx.body = { message: _context.t0.expose ? _context.t0.message : 'An unknown error has occurred' };

				respond();

			case 23:
			case 'end':
				return _context.stop();
		}
	}, null, this, [[2, 17]]);
};