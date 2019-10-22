import { simplify as safeSimplify, InvalidScopeError } from "@authx/scopes";
import { simplify as unsafeSimplify } from "@authx/scopes/dist/scope";

/**
 * A template-compatible version of `isValid` from @authx/scopes.
 *
 * @param template - A string that may be a scope template.
 * @returns Whether or not the template is a valid scope template.
 */
export function isValid(template: string): boolean;

/**
 * A template-compatible version of `isValid` from @authx/scopes.
 *
 * @param templates - An array of strings that may be scope templates.
 * @returns Whether or not every string is a valid scope template.
 */
export function isValid(templates: string[]): boolean;

export function isValid(template: string | string[]): boolean {
  if (Array.isArray(template)) {
    return template.every(isValid);
  }

  const patterns = template.split(":");
  return (
    patterns.length === 3 &&
    patterns.every(pattern =>
      pattern
        .split(".")
        .every(
          part =>
            part === "" ||
            part === "*" ||
            part === "**" ||
            /^[a-zA-Z0-9_-]+$/.test(part) ||
            /^\{[a-zA-Z0-9_]+\}$/.test(part)
        )
    )
  );
}

/**
 * A template-compatible version of `simplify` from @authx/scopes.
 *
 * @param templates - An array of scope templates.
 * @returns An array of scope templates with duplicates removed.
 */
export function simplify(templates: string[]): string[] {
  if (!isValid(templates)) {
    throw new InvalidScopeError("One of the provided templates is invalid.");
  }

  // We are bypassing the default exports of @authx/scopes which ensure the
  // validity of passed scopes. This is undocumented behavior, but by far the
  // simplest approach to acheiving simplification with a characterset beyond
  // those allowed by the scope spec.
  return unsafeSimplify(templates);
}

export function inject(
  templates: string[],
  values: { [key: string]: string }
): string[] {
  const scopes = [];
  template: for (const template of templates) {
    const domains: string[] = [];
    for (const domain of template.split(":")) {
      const segments: string[] = [];
      for (const segment of domain.split(".")) {
        // If this segment does NOT begin with "{" than it is a literal.
        if (segment[0] !== "{") {
          segments.push(segment);
          continue;
        }

        // If we have a value for the variable, use it.
        const value = values[segment.slice(1, segment.length - 1)];
        if (typeof value === "string") {
          segments.push(value);
        }

        // If no value could be found, omit the entire template.
        continue template;
      }
      domains.push(segments.join("."));
    }
    scopes.push(domains.join(":"));
  }

  return safeSimplify(scopes);
}
