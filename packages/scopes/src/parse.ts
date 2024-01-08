import {
  Scope,
  Domain,
  Segment,
  AnySingle,
  AnyMultiple,
  normalize,
} from "./scope.js";
import { ParameterizedScope } from "./parameter.js";

export const LITERAL_SEGMENT = /^[a-zA-Z0-9_-]*$/;
export const TEMPLATE_SEGMENT = /^\{[a-zA-Z0-9_-]+\}$/;
export const PARAMETER_SEGMENT = /^\(([a-z0-9_]+)\)$/;

// Scopes
// -----------------------------------------------------------------------------

export class InvalidScopeError extends Error {}

function parseScopeSegment(
  segmentString: string,
  allowTemplateSegments = false,
): Segment {
  if (segmentString === "**") {
    return AnyMultiple;
  }

  if (segmentString === "*") {
    return AnySingle;
  }

  if (LITERAL_SEGMENT.test(segmentString)) {
    return segmentString;
  }

  if (allowTemplateSegments && TEMPLATE_SEGMENT.test(segmentString)) {
    return segmentString;
  }

  throw new InvalidScopeError("The scope contains an invalid segment.");
}

function parseScopeLiteralSegment(segmentString: string): Segment {
  return parseScopeSegment(segmentString, false);
}

function parseScopeTemplateSegment(segmentString: string): Segment {
  return parseScopeSegment(segmentString, true);
}

function parseScope(scopeString: string, allowTemplateSegments = false): Scope {
  const parse = allowTemplateSegments
    ? parseScopeTemplateSegment
    : parseScopeLiteralSegment;

  const domainStrings = scopeString.split(":");
  if (domainStrings.length !== 3) {
    throw new InvalidScopeError(
      "The scope does not contain exactly 3 domains.",
    );
  }

  return normalize(domainStrings.map((domain) => domain.split(".").map(parse)));
}

export function parseScopeLiteral(scopeString: string): Scope {
  return parseScope(scopeString, false);
}

export function parseScopeTemplate(scopeString: string): Scope {
  return parseScope(scopeString, true);
}

// Parameterized Scopes
// -----------------------------------------------------------------------------

export class InvalidParameterizedScopeError extends Error {}

function parseParameterizedScope(
  scopeString: string,
  allowTemplateSegments: boolean,
): ParameterizedScope {
  const names: Set<string> = new Set();
  const positions: Map<number, Map<number, string>> = new Map();
  const scope: Scope = [];

  const domainStrings = scopeString.split(":");
  if (domainStrings.length !== 3) {
    throw new InvalidParameterizedScopeError(
      "The parameterized scope does not contain exactly 3 domains.",
    );
  }

  // Parse each domain.
  for (const [d, domainString] of domainStrings.entries()) {
    const domain: Domain = (scope[d] = []);
    const domainPositions: Map<number, string> = new Map();
    positions.set(d, domainPositions);

    let domainIndexOfFirstAnyMultiple: number | null = null;
    let domainIndexOfMostRecentParameter: number | null = null;

    // Parse each domain segment.
    for (const [s, segmentString] of domainString.split(".").entries()) {
      const match = segmentString.match(PARAMETER_SEGMENT);

      // The segment is marked for parameter.
      if (match && match[1]) {
        domainIndexOfMostRecentParameter = s;
        const name = match[1];

        // Ensure uniqueness of parameter name.
        if (names.has(name)) {
          throw new InvalidParameterizedScopeError(
            `A parameter name of "${name}" is used multiple times.`,
          );
        } else {
          names.add(name);
        }

        // Set the position and parts.
        domainPositions.set(s, name);
        domain[s] = AnySingle;
        continue;
      }

      // The segment is an AnyMultiple.
      if (segmentString === "**") {
        // Set the index of first AnyMultiple.
        if (domainIndexOfFirstAnyMultiple === null) {
          domainIndexOfFirstAnyMultiple = s;
        }

        // A pattern is invalid if an "**" is present on both sides of a
        // parameterized segment, as the parameter's position is ambiguous.
        if (
          domainIndexOfMostRecentParameter !== null &&
          domainIndexOfFirstAnyMultiple < domainIndexOfMostRecentParameter
        ) {
          throw new InvalidParameterizedScopeError(
            "A parameter has `**` on both sides.",
          );
        }

        domain[s] = AnyMultiple;
        continue;
      }

      if (segmentString === "*") {
        domain[s] = AnySingle;
        continue;
      }

      if (LITERAL_SEGMENT.test(segmentString)) {
        domain[s] = segmentString;
        continue;
      }

      if (allowTemplateSegments && TEMPLATE_SEGMENT.test(segmentString)) {
        domain[s] = segmentString;
        continue;
      }

      throw new InvalidParameterizedScopeError(
        "The parameterized scope contains an invalid segment.",
      );
    }
  }

  return {
    scope: normalize(scope),
    positions: positions,
  };
}

export function parseParameterizedScopeLiteral(
  scopeString: string,
): ParameterizedScope {
  return parseParameterizedScope(scopeString, false);
}

export function parseParameterizedScopeTemplate(
  scopeString: string,
): ParameterizedScope {
  return parseParameterizedScope(scopeString, true);
}

// Injection
// -----------------------------------------------------------------------------

export class MissingValueError extends Error {
  variableName: string;
  constructor(message: string, variableName: string) {
    super(message);
    this.variableName = variableName;
  }
}

export class InvalidValueError extends Error {
  variableName: string;
  constructor(message: string, variableName: string) {
    super(message);
    this.variableName = variableName;
  }
}

function isValidInjectionSegment(segmentString: string): boolean {
  if (segmentString === "**") {
    return true;
  }

  if (segmentString === "*") {
    return true;
  }

  if (LITERAL_SEGMENT.test(segmentString)) {
    return true;
  }

  if (TEMPLATE_SEGMENT.test(segmentString)) {
    return true;
  }

  if (PARAMETER_SEGMENT.test(segmentString)) {
    return true;
  }

  return false;
}

export function inject(
  scope: string,
  values: { [key: string]: null | string },
): null | string;
export function inject(
  collection: string[],
  values: { [key: string]: null | string },
): string[];
export function inject(
  scopeString: string | string[],
  values: { [key: string]: null | string },
): null | string | string[] {
  if (Array.isArray(scopeString)) {
    return scopeString
      .map((template) => inject(template, values))
      .filter((scope): scope is string => typeof scope === "string");
  }

  const domains = scopeString.split(":");
  if (domains.length !== 3) {
    throw new InvalidScopeError("A scope in templateOrCollection is invalid.");
  }

  return domains
    .map((domainString) =>
      domainString
        .split(".")
        .map((segmentString) => {
          if (!isValidInjectionSegment(segmentString)) {
            throw new InvalidScopeError(
              "A scope in templateOrCollection is invalid.",
            );
          }

          // If this segment does NOT begin with "{" then we will treat it is a
          // literal or parameter, and pass it through.
          if (segmentString[0] !== "{") {
            return segmentString;
          }

          // If we have a value for the variable, use it.
          const name = segmentString.slice(1, segmentString.length - 1);
          const value = values[name];

          // If the value is explicitly set to `null`, then we will ignore the
          // template entirely.
          if (value === null) {
            return null;
          }

          // If the value is a string, we will make sure it's valid and use it.
          if (typeof value === "string") {
            if (!isValidInjectionSegment(value)) {
              throw new InvalidValueError(
                `The value of an injected template variable is an invalid scope segment.`,
                name,
              );
            }

            return value;
          }

          // If no value was set, we will throw an error.
          throw new MissingValueError(
            `No value was available for template variable named "${name}".`,
            name,
          );
        })
        .join("."),
    )
    .join(":");
}
