'use strict';

module.exports = {
	table: 'users',
	secondary_indexes: [['team_id'], ['status'], ['last_updated'], ['created']],
	data: [
		{
			id: 'a6a0946d-eeb4-45cd-83c6-c7920f2272eb',
			type: 'human',
			profile: {
				id: 'a4d1e02a-54fd-4ee7-81c8-b66ffa4dbdda',
				displayName: 'Michael Scott'
			},
			team_id: '5063863a-174d-49f4-85e6-14046afe25aa',
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: '0cbd3783-0424-4f35-be51-b42f07a2a987',
			type: 'human',
			profile: {
				id: '0cbd3783-0424-4f35-be51-b42f07a2a987',
				displayName: 'Dwight Schrute'
			},
			team_id: '5063863a-174d-49f4-85e6-14046afe25aa',
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: 'd0fc4c64-a3d6-4d97-9341-07de24439bb1',
			type: 'human',
			profile: {
				id: 'd0fc4c64-a3d6-4d97-9341-07de24439bb1',
				displayName: 'Jim Halpert'
			},
			team_id: '5063863a-174d-49f4-85e6-14046afe25aa',
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9',
			type: 'human',
			profile: {
				id: 'eaa9fa5e-088a-4ae2-a6ab-f120006b20a9',
				displayName: 'Pam Beesly-Halpert'
			},
			team_id: '5063863a-174d-49f4-85e6-14046afe25aa',
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: '306eabbb-cc2b-4f88-be19-4bb6ec98e5c3',
			type: 'human',
			profile: {
				id: '306eabbb-cc2b-4f88-be19-4bb6ec98e5c3',
				displayName: 'Toby Flenderson'
			},
			team_id: null,
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: 'dc396449-2c7d-4a23-a159-e6415ded71d2',
			type: 'human',
			profile: {
				id: 'dc396449-2c7d-4a23-a159-e6415ded71d2',
				displayName: 'Jan Levinson'
			},
			team_id: 'a4d1e02a-54fd-4ee7-81c8-b66ffa4dbdda',
			status: 'disabled',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: '51192909-3664-44d5-be62-c6b45f0b0ee6',
			type: 'human',
			profile: {
				id: '51192909-3664-44d5-be62-c6b45f0b0ee6',
				displayName: 'Darryl Philbin'
			},
			team_id: null,
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: '9ad4b34b-781d-44fe-ac39-9b7ac43dde21',
			type: 'human',
			profile: {
				id: '9ad4b34b-781d-44fe-ac39-9b7ac43dde21',
				displayName: 'Roy Anderson'
			},
			team_id: null,
			status: 'disabled',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		},
		{
			id: '1691f38d-92c8-4d86-9a89-da99528cfcb5',
			type: 'api',
			profile: {
				id: '1691f38d-92c8-4d86-9a89-da99528cfcb5',
				displayName: 'Dunder Mifflin Infinity'
			},
			team_id: null,
			status: 'active',
			last_updated: Date.now() / 1000,
			created: Date.now() / 1000
		}
	]
};
