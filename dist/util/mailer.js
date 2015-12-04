'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = mailer;

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function mailer(config) {

	// stub out a transporter if none is specified
	var transport = config.transport ? _nodemailer2.default.createTransport(config.transport) : { sendMail: function (message, cb) {
			console.warn('Email transport is not set up; message not sent:', message);
			cb(null, message);
		} };

	// wrap nodemailer in a promise
	return function (message) {
		return new Promise(function (resolve, reject) {
			message = Object.assign({}, config.defaults, message);
			transport.sendMail(message, function (err, res) {
				if (err) return reject(err);
				return resolve(res);
			});
		});
	};
}