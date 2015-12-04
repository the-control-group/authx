'use strict';

module.exports = {
	table: 'roles',
	secondary_indexes: [
		['assignments', function(row){
			return row('assignments').coerceTo('array')
			.filter(function(kv) { return kv.nth(1); })
			.map(function(kv) { return kv.nth(0); });
		}, {multi: true}],
		['last_updated'],
		['created']
	],
	data: [{
		id: 'root',
		name: 'Root',
		assignments: {
			'a6a0946d-eeb4-45cd-83c6-c7920f2272eb': true,
			'dc396449-2c7d-4a23-a159-e6415ded71d2': false
		},
		scopes: [
			'**:**:**'
		],
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: 'default',
		name: 'Default User',
		assignments: {
			'a6a0946d-eeb4-45cd-83c6-c7920f2272eb': true,
			'0cbd3783-0424-4f35-be51-b42f07a2a987': true,
			'd0fc4c64-a3d6-4d97-9341-07de24439bb1': true,
			'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9': true,
			'306eabbb-cc2b-4f88-be19-4bb6ec98e5c3': true,
			'dc396449-2c7d-4a23-a159-e6415ded71d2': true,
			'51192909-3664-44d5-be62-c6b45f0b0ee6': true,
			'9ad4b34b-781d-44fe-ac39-9b7ac43dde21': true,
			'1691f38d-92c8-4d86-9a89-da99528cfcb5': true
		},
		scopes: [
			'AuthX:me:read',
			'AuthX:me:update',
			'AuthX:credential.*.me:*',
			'AuthX:grant.*.me:*'
		],
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: '2ec2118e-9c49-474f-9f44-da35c4420ef6',
		name: 'Sales Team',
		assignments: {
			'd0fc4c64-a3d6-4d97-9341-07de24439bb1': true,
			'0cbd3783-0424-4f35-be51-b42f07a2a987': true,
			'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9': true
		},
		scopes: [
			'website:sales:**'
		],
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: 'e3e67ba0-626a-4fb6-ad86-6520d4acfaf6',
		name: 'Warehouse Staff',
		assignments: {
			'51192909-3664-44d5-be62-c6b45f0b0ee6': true,
			'9ad4b34b-781d-44fe-ac39-9b7ac43dde21': true
		},
		scopes: [
			'website:shippments:**'
		],
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}, {
		id: '08e2b39e-ba9f-4de2-8dca-aef460793566',
		name: 'HR',
		assignments: {
			'306eabbb-cc2b-4f88-be19-4bb6ec98e5c3': true
		},
		scopes: [
			'AuthX:user:**',
			'AuthX:credential.*.user:**'
		],
		last_updated: Date.now() / 1000,
		created: Date.now() / 1000
	}]
};
