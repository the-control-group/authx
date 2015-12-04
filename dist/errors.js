'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
class ValidationError extends Error {
	constructor(message, validation, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.message = message || 'The data is not valid.';
		this.validation = validation || {};
		this.status = this.statusCode = 400;
	}

	expose() {
		return {
			message: this.message,
			validation: this.validation
		};
	}
}

exports.ValidationError = ValidationError;
class NotFoundError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'The resource does not exist.';
		this.status = this.statusCode = 404;
	}
}

exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'A duplicate resource already exists.';
		this.status = this.statusCode = 409;
	}
}

exports.ConflictError = ConflictError;
class AuthenticationError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'Authentication failed.';
		this.status = this.statusCode = 401;
	}
}

exports.AuthenticationError = AuthenticationError;
class ForbiddenError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'The action is forbidden.';
		this.status = this.statusCode = 403;
	}
}
exports.ForbiddenError = ForbiddenError;