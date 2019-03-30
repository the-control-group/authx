export class ValidationError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public validation: any;
  public expose: true = true;

  public constructor(
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
}

export class UnsupportedMediaTypeError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The media type is unsupported.";
    this.status = this.statusCode = 415;
  }
}

export class NotFoundError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The resource does not exist.";
    this.status = this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "A duplicate resource already exists.";
    this.status = this.statusCode = 409;
  }
}

export class AuthenticationError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "Authentication failed.";
    this.status = this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The action is forbidden.";
    this.status = this.statusCode = 403;
  }
}

export class ServerError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "An unknown error has occurred.";
    this.status = this.statusCode = 500;
  }
}

export class NotImplementedError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status: number;
  public statusCode: number;
  public expose: true = true;

  public constructor(message?: string, fileName?: string, lineNumber?: number) {
    super(message);
    if (typeof fileName !== undefined) this.fileName = fileName;
    if (typeof lineNumber !== undefined) this.lineNumber = lineNumber;
    this.message = message || "The requested functionality is not implemented.";
    this.status = this.statusCode = 501;
  }
}
