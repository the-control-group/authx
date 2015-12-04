import qs from 'querystring';
import parse from 'raw-body';
import * as errors from '../errors';

export default async function form(req) {
	try {
		var data = await parse(req, { encoding: 'utf8' });
		return qs.parse(data);
	} catch (e) {
		throw new errors.ValidationError('The request body was invalid form data.');
	}
}
