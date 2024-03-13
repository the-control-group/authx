export class ValidationError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 400 as const;
  public statusCode = 400 as const;
  public validation: any;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    validation?: string,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "The data is not valid.";
    this.expose = expose;
    this.validation = validation || {};
    this.status = this.statusCode = 400;
  }
}

export class UnsupportedMediaTypeError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 415 as const;
  public statusCode = 415 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "The media type is unsupported.";
    this.expose = expose;
  }
}

export class NotFoundError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 404 as const;
  public statusCode = 404 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "The resource does not exist.";
    this.expose = expose;
  }
}

export class ConflictError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 409 as const;
  public statusCode = 409 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "A duplicate resource already exists.";
    this.expose = expose;
  }
}

export class AuthenticationError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 401 as const;
  public statusCode = 401 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "Authentication failed.";
    this.expose = expose;
  }
}

export class ForbiddenError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 403 as const;
  public statusCode = 403 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "The action is forbidden.";
    this.expose = expose;
  }
}

export class ServerError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 500 as const;
  public statusCode = 500 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "An unknown error has occurred.";
    this.expose = expose;
    this.status = this.statusCode = 500;
  }
}

export class NotImplementedError extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 501 as const;
  public statusCode = 501 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "The requested functionality is not implemented.";
    this.expose = expose;
    this.status = this.statusCode = 501;
  }
}

export class TooManyRequests extends Error {
  public fileName?: string;
  public lineNumber?: number;
  public status = 429 as const;
  public statusCode = 429 as const;
  public expose: boolean;

  public constructor(
    message?: string,
    expose: boolean = true,
    fileName?: string,
    lineNumber?: number,
  ) {
    super(message);
    if (typeof fileName !== "undefined") this.fileName = fileName;
    if (typeof lineNumber !== "undefined") this.lineNumber = lineNumber;
    this.message = message || "Too many requests.";
    this.expose = expose;
    this.status = this.statusCode = 429;
  }
}
