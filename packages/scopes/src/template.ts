import { simplify, isValidScopeSegment } from "./scope";

export class InvalidTemplateError extends Error {}
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

export function isValidScopeTemplateSegment(segment: string): boolean {
  return isValidScopeSegment(segment) || /^\{[a-zA-Z0-9_-]+\}$/.test(segment);
}

export function isValidScopeTemplate(
  templateOrCollection: string | string[]
): boolean {
  if (Array.isArray(templateOrCollection)) {
    return templateOrCollection.every(isValidScopeTemplate);
  }

  const domains = templateOrCollection.split(":");
  return (
    domains.length === 3 &&
    domains.every(pattern =>
      pattern.split(".").every(isValidScopeTemplateSegment)
    )
  );
}

export function inject(
  template: string,
  values: { [key: string]: null | string }
): null | string;
export function inject(
  collection: string[],
  values: { [key: string]: null | string }
): string[];
export function inject(
  templateOrCollection: string | string[],
  values: { [key: string]: null | string }
): null | string | string[] {
  if (Array.isArray(templateOrCollection)) {
    return simplify(
      templateOrCollection
        .map(template => inject(template, values))
        .filter((scope): scope is string => typeof scope === "string")
    );
  }

  const domains = templateOrCollection.split(":");
  if (domains.length !== 3) {
    throw new InvalidTemplateError(
      "A scope in templateOrCollection is invalid."
    );
  }

  return domains
    .map(domain =>
      domain
        .split(".")
        .map(segment => {
          if (!isValidScopeTemplateSegment(segment)) {
            throw new InvalidTemplateError(
              "A scope in templateOrCollection is invalid."
            );
          }

          // If this segment does NOT begin with "{" than it is a literal.
          if (segment[0] !== "{") {
            return segment;
          }

          // If we have a value for the variable, use it.
          const name = segment.slice(1, segment.length - 1);
          const value = values[name];

          // If the value is explicitly set to `null`, then we will ignore the
          // template entirely.
          if (value === null) {
            return null;
          }

          // If the value is a string, we will make sure it's valid and use it.
          if (typeof value === "string") {
            if (!isValidScopeTemplateSegment(value)) {
              throw new InvalidValueError(
                `The value of an injected template variable is an invalid scope segment.`,
                name
              );
            }

            return value;
          }

          // If no value was set, we will throw an error.
          throw new MissingValueError(
            `No value was available for a template variable.`,
            name
          );
        })
        .join(".")
    )
    .join(":");
}
