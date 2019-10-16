import { getIntersection, isSuperset } from "./scope";

export class InvalidTemplateError extends Error {}

function parse(
  template: string
): { scope: string; positions: Map<number, Map<number, string>> } {
  const domains = template.split(":");

  const parameterNames: Set<string> = new Set();
  const parameterPositions: Map<number, Map<number, string>> = new Map();
  const remappedDomains: string[] = [];

  // Parse each template domain.
  for (let d = 0; d < domains.length; d++) {
    const domain = domains[d];
    const domainSegments = domain.split(".");
    const domainParameterPositions: Map<number, string> = new Map();
    const domainRemappedParts: string[] = [];

    let domainIndexOfFirstAnyMultiple: number | null = null;
    let domainIndexOfMostRecentParameter: number | null = null;

    // Parse each domain segment.
    for (let s = 0; s < domainSegments.length; s++) {
      const segment = domainSegments[s];
      const match = segment.match(/^\(([a-z0-9_]+)\)$/);

      // The segment is marked for parameter.
      if (match && match[1]) {
        domainIndexOfMostRecentParameter = s;
        const name = match[1];

        // Ensure uniqueness of parameter name.
        if (parameterNames.has(name)) {
          throw new InvalidTemplateError(
            `An parameter name of "${name}" cannot be used multiple times.`
          );
        } else {
          parameterNames.add(name);
        }

        // Set the position and parts.
        domainParameterPositions.set(s, name);
        domainRemappedParts[s] = "*";
        continue;
      }

      // The segment is invalid.
      if (
        segment !== "" &&
        segment !== "*" &&
        segment !== "**" &&
        !/^[a-zA-Z0-9_-]+$/.test(segment)
      ) {
        throw new InvalidTemplateError(
          "The template contained an invalid segment."
        );
      }

      // The segment is an AnyMultiple.
      if (segment === "**") {
        // Set the index of first AnyMultiple.
        if (domainIndexOfFirstAnyMultiple === null) {
          domainIndexOfFirstAnyMultiple = s;
        }

        // A template is invalid if an "**" is present on both sides of a
        // parameterized segment, as the parameter's position is ambiguous.
        if (
          domainIndexOfMostRecentParameter !== null &&
          domainIndexOfFirstAnyMultiple < domainIndexOfMostRecentParameter
        ) {
          throw new InvalidTemplateError(
            "An parameter segment cannot have `**` on both sides."
          );
        }
      }

      domainRemappedParts[s] = segment;
    }

    // Assemble the remapped domain.
    remappedDomains[d] = domainRemappedParts.join(".");
    parameterPositions.set(d, domainParameterPositions);
  }

  return {
    scope: remappedDomains.join(":"),
    positions: parameterPositions
  };
}

export function extract(
  template: string,
  scopes: string[]
): ReadonlyArray<{
  scope: string;
  parameters: {
    [key: string]: string;
  };
}> {
  // Parse the template.
  const { scope, positions } = parse(template);

  // Get the intersections.
  const intersections = getIntersection(scope, scopes);

  // Extract parameters from each intersection.
  return intersections
    .filter(scope => isSuperset(scopes, scope))
    .map(scope => {
      const parameters: { [name: string]: string } = Object.create(null);
      for (const [d, domain] of scope.split(":").entries()) {
        const domainParameterPositions = positions.get(d);
        if (!domainParameterPositions) continue;
        for (const [s, segment] of domain.split(".").entries()) {
          const name = domainParameterPositions.get(s);
          if (!name) continue;

          // Because a parameter represents a single segment, a "*" will always
          // be returned to note a wildcard.
          parameters[name] = segment === "**" ? "*" : segment;
        }
      }

      return {
        scope,
        parameters
      };
    });
}
