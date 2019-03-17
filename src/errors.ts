export class ValidationError extends Error {
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  validation: any;

  constructor(
    message?: string,
    validation?: string,
    fileName?: string,
    lineNumber?: number
  ) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The data is not valid.";
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
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  expose: true = true;

  constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The resource does not exist.";
    this.status = this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  expose: true = true;

  constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "A duplicate resource already exists.";
    this.status = this.statusCode = 409;
  }
}

export class AuthenticationError extends Error {
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  expose: true = true;

  constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "Authentication failed.";
    this.status = this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  expose: true = true;

  constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The action is forbidden.";
    this.status = this.statusCode = 403;
  }
}

export class ServerError extends Error {
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  expose: true = true;

  constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "An unknown error has occurred.";
    this.status = this.statusCode = 500;
  }
}

export class NotImplementedError extends Error {
  fileName?: string;
  lineNumber?: number;
  status: number;
  statusCode: number;
  expose: true = true;

  constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The requested functionality is not implemented.";
    this.status = this.statusCode = 501;
  }
}
