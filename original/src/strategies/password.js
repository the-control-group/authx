const jjv = require("jjv");
const auth = require("basic-auth");
const json = require("../util/json");
const form = require("../util/form");
const { hash, compare } = require("../util/bcrypt");
const errors = require("../errors");
const x = require("../namespace");

const Strategy = require("../Strategy");
const Credential = require("../models/Credential");
const User = require("../models/User");

var env = jjv();

env.addSchema({
	id: "authority",
	type: "object",
	properties: {
		rounds: {
			type: "number",
			title: "BCrypt Rounds",
			description:
				"BCrypt encryption rounds for new passwords; old passwords will continue to use their original number of rounds.",
			default: 4
		}
	}
});

env.addSchema({
	id: "credential",
	type: "object",
	properties: {
		password: {
			type: "string",
			title: "Password",
			description:
				"The user's password, sent as plain text; stored as a bcrypt hash."
		}
	}
});

module.exports = class PasswordStrategy extends Strategy {
	async authenticate(ctx) {
		ctx.redirect_to = ctx.query.url;
		var request;

		// HTTP POST (json)
		if (ctx.method === "POST" && ctx.is("application/json"))
			request = await json(ctx.req);
		// HTTP POST (form)
		else if (
			ctx.method === "POST" &&
			ctx.is("application/x-www-form-urlencoded")
		)
			request = await form(ctx.req);
		// HTTP Basic Authentication
		else {
			let basic = auth(ctx.req);
			if (basic)
				try {
					request = {
						username: JSON.parse(basic.name),
						password: basic.pass
					};
				} catch (err) {
					ctx.throw(
						400,
						'The HTTP basic `username` must be a JSON-encoded array in the format: ["authority","authority_user_id"].'
					);
				}
		}

		// send authenticate headers
		if (!request) {
			ctx.set(
				"WWW-Authenticate",
				'Basic realm="' + ctx[x].authx.config.realm + '"'
			);
			ctx.throw(401, "HTTP Basic credentials are required.");
		}

		// validate the credential_id
		var credential_id = request.username;
		if (
			!Array.isArray(credential_id) ||
			credential_id.length !== 2 ||
			!credential_id.every(s => typeof s === "string")
		)
			ctx.throw(
				400,
				'The `username` must be an array in the format: ["authority","authority_user_id"].'
			);

		// validate the password
		var password = request.password;
		if (!password)
			ctx.throw(400, "The HTTP basic `password` must be specified.");

		// get the user ID
		var user_id =
			credential_id[0] === this.authority.id
				? credential_id[1]
				: (await Credential.get(this.conn, credential_id)).user_id;

		// make sure this is the correct user
		if (ctx[x].user && ctx[x].user.id !== user_id)
			throw new errors.AuthenticationError(
				"You are already logged in as a different user."
			);

		// get the user's password credential
		var credential = await Credential.get(this.conn, [
			this.authority.id,
			user_id
		]);

		// validate password
		if (!(await compare(password, credential.details.password))) {
			ctx.set("WWW-Authenticate", 'Basic realm="authx"');
			ctx.throw(401, "Incorrect password.");
		}

		var [user] = await Promise.all([
			// get the user
			User.get(this.conn, user_id),

			// update the credential's last_used timestamp
			credential.update({ last_used: Date.now() / 1000 })
		]);

		// return the user
		return user;
	}

	// Authority Methods
	// -----------------

	static async createAuthority(conn, data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate("authority", data.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				"The authority details were invalid.",
				err.validation
			);

		return Strategy.createAuthority.call(this, conn, data);
	}

	static async updateAuthority(authority, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate("authority", delta.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				"The authority details were invalid.",
				err.validation
			);

		return Strategy.updateAuthority.call(this, authority, delta);
	}

	// Credential Methods
	// ------------------

	async createCredential(data) {
		data.details = data.details || {};

		// validate data
		var err = env.validate("credential", data.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				"The credential details were invalid.",
				err.validation
			);

		// hash the password
		data.details.password = await hash(
			data.details.password,
			this.authority.details.rounds
		);

		return Strategy.prototype.createCredential.call(this, data);
	}

	async updateCredential(credential, delta) {
		delta.details = delta.details || {};

		// validate data
		var err = env.validate("credential", delta.details, { useDefault: true });
		if (err)
			throw new errors.ValidationError(
				"The credential details were invalid.",
				err.validation
			);

		// hash the password
		if (delta.details.password)
			delta.details.password = await hash(
				delta.details.password,
				this.authority.details.rounds
			);

		return Strategy.prototype.updateCredential.call(this, credential, delta);
	}
};
