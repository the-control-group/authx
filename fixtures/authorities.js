'use strict';

module.exports = {
	table: 'authorities',
	secondary_indexes: [
		['last_updated'],
		['created']
	],
	data: [{
		id: 'email',
		name: 'Email',
		strategy: 'email',
		details: {
			expiresIn: 3600,
			subject: 'Reset your password',
			text: '{{{token}}}',
			html: '<a href="{{url}}">reset</a>'
		},
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: 'password',
		name: 'Password',
		strategy: 'password',
		details: {
			rounds: 4
		},
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: 'secret',
		name: 'Secret',
		strategy: 'secret',
		details: {
			rounds: 4
		},
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: 'google',
		name: 'Google',
		strategy: 'google',
		details: {
			client_id: '210657947312-8s9g76sc7g1goes6tu2h4jmp3t41i8pb.apps.googleusercontent.com',
			client_secret: 'HxojpEHE44oY-SGzC_IIzhkW',
			email_authority_id: 'email',
			email_domains: null,
			role_ids: [
				'default'
			]
		},
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}]
};
