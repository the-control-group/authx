import uuid from 'uuid';
import jwt from 'jsonwebtoken';
import json from '../util/json';
import form from '../util/form';
import * as scopes from '../util/scopes';
import * as errors from '../errors';
import Client from '../models/Client';
import Grant from '../models/Grant';

let scopeRegex = /^(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+):(([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)\.)*([a-zA-Z0-9_\-]+|(\*(?!\*\*))+)$/;

export default async (ctx) => {



	// Authorization Code Request
	// --------------------------
	// The client requests an authorization code from the server.

	if (ctx.query.response_type === 'code') {

		if (!ctx.query.client_id)
			throw new errors.ValidationError('A `client_id` must be defined.');

		if (!ctx.query.redirect_uri)
			throw new errors.ValidationError('A `redirect_uri` must be defined.');

		if (typeof ctx.query.scope === 'undefined')
			throw new errors.ValidationError('A `scope` must be defined.');

		// parse & validate the scopes
		let requestedScopes = ctx.query.scope.split(' ');
		if (!requestedScopes.every(s => scopeRegex.test(s)))
			throw new errors.ValidationError('The `scope` parameter must be a space-separated list of AuthX scopes.');



		// get the client
		let client = await Client.get(ctx.conn, ctx.query.client_id);



		// TODO: verify the redirect_uri against client base_urls



		// If the user does not have an active session, send her to the login page.
		if (!ctx.session || ctx.session.sub !== ctx.user.id) {
			ctx.redirect(ctx.app.config.routes.login + (ctx.app.config.routes.login.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(ctx.url));
			ctx.body = {url: ctx.url};
			return;
		}




		let grant;

		// start with globally authorized scopes for this client
		let globallyAuthorizedScopes = client.scopes;
		let authorizedScopes = globallyAuthorizedScopes.slice();
		let userAuthorizedScopes = [];



		// do we also need user-authorized scopes?
		if (!requestedScopes.every(rS => authorizedScopes.some(aS => scopes.can(aS, rS)))) {



			// the user has just authorized this client for certain scopes
			if (ctx.method === 'POST') {
				try {
					let data = await json(ctx.req);
					if (
						!data.scopes
						|| !Array.isArray(data.scopes)
						|| !data.scopes.every(s => (typeof s === 'string') && scopeRegex.test(s))
					) throw new Error();
				} catch (err) {
					throw new errors.ValidationError('Authorized `scopes` must be a json-encoded array of scopes.');
				}

				userAuthorizedScopes = data.scopes;
				authorizedScopes = scopes.simplifyCollection(authorizedScopes.concat(userAuthorizedScopes));
			}




			// look for a previous grant issued to this client by the user
			else try {
				grant = await Grant.get(ctx.conn, [ctx.user.id, client.id]);
				userAuthorizedScopes = grant.scopes;
				authorizedScopes = scopes.simplifyCollection(authorizedScopes.concat(userAuthorizedScopes));
			} catch (err) {

				// the user has not already authorized this client for the given scopes; prompt her to authorize the client for the given scopes.
				if (err instanceof errors.NotFoundError)
					return requestApproval(ctx);

				throw err;
			}


			// make sure that the authorized scopes fulfil all the requested scopes, otherwise prompt
			if (!requestedScopes.every(rS => authorizedScopes.some(aS => scopes.can(aS, rS))))
				return requestApproval(ctx);



		}





		// generate and store an authorization code.
		let nonce = uuid.v4();
		let code = new Buffer(JSON.stringify([ctx.user.id, nonce])).toString('base64');
		grant = await Grant.save(ctx.conn, [ctx.user.id, client.id], {
			nonce: nonce,
			scopes: userAuthorizedScopes
		});



		// redirect the user back to the client with an authorization code.
		ctx.redirect(ctx.query.redirect_uri + (ctx.query.redirect_uri.includes('?') ? '&' : '?') + 'code=' + code + '&state=' + ctx.query.state );
		ctx.body = {code: code};
		return;
	}








	// Access Token Exchange
	// ---------------------
	// The client exchanged an authorization code for an access token.

	else if (ctx.method === 'POST') {
		var data;




		// HTTP POST (json)
		if (ctx.is('application/json'))
			data = await json(ctx.req);

		// HTTP POST (form)
		else if (ctx.is('application/x-www-form-urlencoded'))
			data = await form(ctx.req);




		if (!data.client_id)
			throw new errors.ValidationError('A valid `client_id` must be provided.');

		if (!data.client_secret)
			throw new errors.ValidationError('A valid `client_secret` must be provided.');




		let client = await Client.get(ctx.conn, data.client_id);
		if (client.secret !== data.client_secret)
			throw new errors.ForbiddenError('The client secret was incorrect.');




		let grant;




		// ### Authorization Code
		if (data.grant_type === 'authorization_code') {
			let code;

			if (!data.code)
				throw new errors.ValidationError('A valid `code` must be provided.');

			try {
				code = new Buffer(data.code, 'base64').toString('utf8');
				code = JSON.parse(code);
				if (
					!Array.isArray(code)
					|| code.length !== 2
					|| typeof code[0] !== 'string'
					|| typeof code[1] !== 'string'
				) throw new Error();
			} catch (err) {
				throw new errors.ValidationError('The provided `code` is invalid.');
			}


			// get the corresponding grant, with the single-use nonce value
			grant = await Grant.getWithNonce(ctx.conn, [code[0], data.client_id], code[1]);

		}

		// ### Refresh Token
		else if (data.grant_type === 'refresh_token') {
			let refresh_token;

			if (!data.refresh_token)
				throw new errors.ValidationError('A valid `refresh_token` must be provided.');

			try {
				refresh_token = new Buffer(data.refresh_token, 'base64').toString('utf8');
				refresh_token = JSON.parse(refresh_token);
				if (
					!Array.isArray(refresh_token)
					|| refresh_token.length !== 2
					|| typeof refresh_token[0] !== 'string'
					|| typeof refresh_token[1] !== 'string'
				) throw new Error();
			} catch (err) {
				throw new errors.ValidationError('The provided `refresh_token` is invalid.');
			}



			// get the corresponding grant, with the single-use nonce value
			grant = await Grant.get(ctx.conn, [refresh_token[0], data.client_id]);



			// validate the refresh token
			if (grant.refresh_token !== refresh_token[1])
				throw new errors.ValidationError('The provided `refresh_token` is incorrect.');


		}


		else
			throw new errors.ValidationError('The `grant_type` must be "authorization_code" or "refresh_token".');


		let user = await grant.user();


		// scopes globally authorized to the client
		let globallyAuthorizedScopes = client.scopes;

		// all scopes (global + user) authorized by this grant
		let authorizedScopes = scopes.simplifyCollection(globallyAuthorizedScopes.concat(grant.scopes));

		// all scopes (grant x user) authorized in the token
		let totalScopes = scopes.combineCollections(authorizedScopes, await user.scopes());




		// generate the access token
		let access_token = jwt.sign({
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
		if (scopes.can(totalScopes, 'AuthX:me:read'))
			ctx.body.user = user;


	}

	else
		throw new errors.ValidationError('Missing `response_type=code` query parameter or POST body.');


};


function requestApproval (ctx) {
	var url = encodeURIComponent(ctx.url);
	var scope = encodeURIComponent(ctx.query.scope);
	ctx.redirect(ctx.app.config.routes.authorize + (ctx.app.config.routes.authorize.includes('?') ? '&' : '?') + 'url=' + url + '&scope=' + scope);
	ctx.body = {url: url, scope: scope};
}

