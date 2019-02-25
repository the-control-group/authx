'use strict';

module.exports = {
	table: 'grants',
	secondary_indexes: [
		[
			'user_id',
			function(row) {
				return row('id').nth(0);
			}
		],
		[
			'client_id',
			function(row) {
				return row('id').nth(1);
			}
		],
		['last_updated'],
		['created']
	],
	data: [
		{
			id: ['a6a0946d-eeb4-45cd-83c6-c7920f2272eb', 'dundermifflin-inventory'],
			nonce: null,
			scopes: ['**:**:**'],
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: ['51192909-3664-44d5-be62-c6b45f0b0ee6', 'dundermifflin-inventory'],
			nonce: 'd122298d-55d9-4eee-9c17-463113669007',
			scopes: ['**:**:**'],
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		}
	]
};
