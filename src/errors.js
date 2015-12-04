export class ValidationError extends Error {
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

export class NotFoundError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'The resource does not exist.';
		this.status = this.statusCode = 404;
	}
}

export class ConflictError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'A duplicate resource already exists.';
		this.status = this.statusCode = 409;
	}
}

export class AuthenticationError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'Authentication failed.';
		this.status = this.statusCode = 401;
	}
}

export class ForbiddenError extends Error {
	constructor(message, fileName, lineNumber) {
		super(message, fileName, lineNumber);
		this.expose = true;
		this.message = message || 'The action is forbidden.';
		this.status = this.statusCode = 403;
	}
}

