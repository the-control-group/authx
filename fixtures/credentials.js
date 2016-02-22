'use strict';

module.exports = {
	table: 'credentials',
	secondary_indexes: [
		['authority_id', function(row) {
			return row('id').nth(0);
		}],
		['authority_user_id', function(row) {
			return row('id').nth(1);
		}],
		['user_id'],
		['last_used'],
		['last_updated'],
		['created']
	],
	data: [{
		id: ['email', 'michael.scott@dundermifflin.com'],
		user_id: 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'dwight.schrute@dundermifflin.com'],
		user_id: '0cbd3783-0424-4f35-be51-b42f07a2a987',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'jim.halpert@dundermifflin.com'],
		user_id: 'd0fc4c64-a3d6-4d97-9341-07de24439bb1',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'pam.beesly-halpert@dundermifflin.com'],
		user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'toby.flenderson@dundermifflin.com'],
		user_id: '306eabbb-cc2b-4f88-be19-4bb6ec98e5c3',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'jan.levinson@dundermifflin.com'],
		user_id: 'dc396449-2c7d-4a23-a159-e6415ded71d2',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'darryl.philbin@dundermifflin.com'],
		user_id: '51192909-3664-44d5-be62-c6b45f0b0ee6',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['email', 'roy.anderson@dundermifflin.com'],
		user_id: '9ad4b34b-781d-44fe-ac39-9b7ac43dde21',
		details: {
			token: null
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb'],
		user_id: 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb',
		details: {
			password: '$2a$04$j.W.ev.hBuIZZEKRZRpcPOmHz6SjaYtg/cO8vnBlq3lHHnFh2B1N2' // password: 123456
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', '0cbd3783-0424-4f35-be51-b42f07a2a987'],
		user_id: '0cbd3783-0424-4f35-be51-b42f07a2a987',
		details: {
			password: '$2a$04$VAAR33JYHsDALax5e0DO2eVkqitvn5UZOL0awZk90e7CwoxJvbrOW' // password: beets are awesome
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', 'd0fc4c64-a3d6-4d97-9341-07de24439bb1'],
		user_id: 'd0fc4c64-a3d6-4d97-9341-07de24439bb1',
		details: {
			password: '$2a$04$9AqH/83kt7Tid5n01ysLBOs2u23S/2PUWXKf9vOzOUzyk6.kwT4R2' // password: baseball
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9'],
		user_id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9',
		details: {
			password: '$2a$04$EnRptYjQNyS5zo16RyuOie5QJGAuq492YhQVzoWZe96y9LYjJEU8K' // password: i love jim
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', '306eabbb-cc2b-4f88-be19-4bb6ec98e5c3'],
		user_id: '306eabbb-cc2b-4f88-be19-4bb6ec98e5c3',
		details: {
			password: '$2a$04$bEApeUnCL0pMAZf6fNym9OO/z6SJsyN6CY773Fx1O7ZTSzgwu1pXG' // password: costa rica
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', 'dc396449-2c7d-4a23-a159-e6415ded71d2'],
		user_id: 'dc396449-2c7d-4a23-a159-e6415ded71d2',
		details: {
			password: '$2a$04$GM8OJ7/Oq4H2Q.d9Yk3Ga.ffKmrUez7EYTHmEoX7jHpkDmmepl1/W' // password: you can get through today
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', '51192909-3664-44d5-be62-c6b45f0b0ee6'],
		user_id: '51192909-3664-44d5-be62-c6b45f0b0ee6',
		details: {
			password: '$2a$04$cVcd/QO4.LxGRTi7g4iON.HAiFsmuKBqcIp9WvTTTWTBhbnjHMRbe' // password: whatever
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['password', '9ad4b34b-781d-44fe-ac39-9b7ac43dde21'],
		user_id: '9ad4b34b-781d-44fe-ac39-9b7ac43dde21',
		details: {
			password: '$2a$04$R/nz0oaq8l4Ba0CNznZ3v.P2CRZEN/z4jN/2s1VFMPFVTQ9qQL/WO' // password: art sucks
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: ['secret', '1691f38d-92c8-4d86-9a89-da99528cfcb5'],
		user_id: '1691f38d-92c8-4d86-9a89-da99528cfcb5',
		details: {
			secret: '$2a$04$SPRITTeZvQ9hI.TPkvoE0Op19wAgBlObKRQ6sz.ahjVVDFBajjFrO' // secret: da8ad1c19e0f
		},
		profile: null,
		last_used: null,
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}]
};
