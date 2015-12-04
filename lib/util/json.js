import parse from 'raw-body';
import * as errors from '../errors';

export default async function json(req) {
	try {
		var data = await parse(req, { encoding: 'utf8' });
		return JSON.parse(data);
	} catch (e) {
		throw new errors.ValidationError('The request body was invalid JSON.');
	}
}
