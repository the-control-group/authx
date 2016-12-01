const qs = require('querystring');
const parse = require('raw-body');
const errors = require('../errors');

module.exports = async function form(req) {
	try {
		var data = await parse(req, { encoding: 'utf8' });
		return qs.parse(data);
	} catch (e) {
		throw new errors.ValidationError('The request body was invalid form data.');
	}
};
