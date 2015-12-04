import Promise from 'bluebird';
import json from '../util/json';
import {protect, can} from '../util/protect';
import Team from '../models/Team';

export async function post(ctx) {
	await protect(ctx, 'AuthX:team:create');
	var data = await json(ctx.req);
	ctx.body = await Team.create(ctx.conn, data);
	ctx.status = 201;
}

export async function query(ctx) {
	var teams = await Team.query(ctx.conn);
	ctx.body = await Promise.filter(teams, c => can(ctx, 'AuthX:team.' + c.id + ':read'));
}

export async function get(ctx) {
	await protect(ctx, 'AuthX:team.' + ctx.params.team_id + ':read');
	ctx.body = await Team.get(ctx.conn, ctx.params.team_id);
}

export async function patch(ctx) {
	await protect(ctx, 'AuthX:team.' + ctx.params.team_id + ':update');
	var data = await json(ctx.req);
	ctx.body = await Team.update(ctx.conn, ctx.params.team_id, data);
}

export async function del(ctx) {
	await protect(ctx, 'AuthX:team.' + ctx.params.team_id + ':delete');
	ctx.body = await Team.delete(ctx.conn, ctx.params.team_id);
}
