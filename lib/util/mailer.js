import nodemailer from 'nodemailer';

export default function mailer(config) {

	// stub out a transporter if none is specified
	var transport = config.transport ?
		nodemailer.createTransport(config.transport)
		: { sendMail: (message, cb) => {
			console.warn('Email transport is not set up; message not sent:', message);
			cb(null, message);
		}};

	// wrap nodemailer in a promise
	return (message) => {
		return new Promise( (resolve, reject) => {
			message = Object.assign({}, config.defaults, message);
			transport.sendMail(message, (err, res) => {
				if(err) return reject(err);
				return resolve(res);
			});
		});
	};
}
