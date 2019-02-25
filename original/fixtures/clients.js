'use strict';

module.exports = {
	table: 'clients',
	secondary_indexes: [
		['base_urls', { multi: true }],
		['last_updated'],
		['created']
	],
	data: [
		{
			id: 'AuthX',
			name: 'AuthX Management Dashboard',
			secret:
				'aae04519edf709ec1652fa3a72ee190412ca1f6ce6d8bb53dfc52f7ea484a0c7',
			scopes: ['**:**:**'],
			base_urls: [],
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: 'dundermifflin-inventory',
			name: 'Dunder Mifflin Inventory Portal',
			secret:
				'1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2',
			scopes: [],
			base_urls: [
				'https://www.dundermifflin.com',
				'https://admin.dundermifflin.com'
			],
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		}
	]
};
