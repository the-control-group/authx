'use strict';

module.exports = {
	table: 'teams',
	secondary_indexes: [['last_updated'], ['created']],
	data: [
		{
			id: 'a4d1e02a-54fd-4ee7-81c8-b66ffa4dbdda',
			name: 'Management Team',
			settings: {},
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: '5063863a-174d-49f4-85e6-14046afe25aa',
			name: 'Sales Team',
			settings: {},
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		}
	]
};
