import { getIntersection } from "@authx/scopes";

export type PatternDescriptionMap = {
  [pattern: string]: string;
};

export function humanizeScopes(
  configs: PatternDescriptionMap[],
  context: {
    currentAuthorizationId: null | string;
    currentUserId: null | string;
    currentGrantId: null | string;
  },
  scopes: string
): ReadonlyArray<string> {
  // Inject context variables

  // Create combinations

  // Test and extract variables from each scope

  return [];
}

export class InvalidTemplateError extends Error {}

export function extract(
  template: string,
  scopes: string[]
): ReadonlyArray<{
  scope: string;
  values: {
    [key: string]: string | null;
  };
}> {
  const domains = template.split(":");

  const extractionNames: Set<string> = new Set();
  const extractionPositions: Map<number, Map<number, string>> = new Map();
  const remappedDomains: string[] = [];

  // Parse each template domain.
  for (let d = 0; d < domains.length; d++) {
    const domain = domains[d];
    const domainSegments = domain.split(".");
    const domainExtractionPositions: Map<number, string> = new Map();
    const domainRemappedParts: string[] = [];

    let domainIndexOfFirstAnyMultiple: number | null = null;
    let domainIndexOfMostRecentExtraction: number | null = null;

    // Parse each domain segment.
    for (let s = 0; s < domainSegments.length; s++) {
      const segment = domainSegments[s];
      const match = segment.match(/^\(([a-z0-9_-]+)\)$/);

      // The segment is marked for extraction.
      if (match && match[1]) {
        domainIndexOfMostRecentExtraction = s;
        const name = match[1];

        // Ensure uniqueness of extraction name.
        if (extractionNames.has(name)) {
          throw new InvalidTemplateError(
            `An extraction name of "${name}" cannot be used multiple times.`
          );
        } else {
          extractionNames.add(name);
        }

        // Set the position and parts.
        domainExtractionPositions.set(s, name);
        domainRemappedParts[s] = "*";
        continue;
      }

      // The segment is an AnyMultiple.
      if (segment === "**") {
        // Set the index of first AnyMultiple.
        if (domainIndexOfFirstAnyMultiple === null) {
          domainIndexOfFirstAnyMultiple = s;
        }

        // A template is invalid of an AnyMultiple is present on both sides of
        // an extraction segment, as the extraction position is ambiguous.
        if (
          domainIndexOfMostRecentExtraction !== null &&
          domainIndexOfFirstAnyMultiple < domainIndexOfMostRecentExtraction
        ) {
          throw new InvalidTemplateError(
            "An extraction segment cannot have `**` on both sides."
          );
        }
      }

      domainRemappedParts[s] = segment;
    }

    // Assemble the remapped domain.
    remappedDomains[d] = domainRemappedParts.join(".");
    extractionPositions.set(d, domainExtractionPositions);
  }

  // Get the intersections.
  const intersections = getIntersection(remappedDomains.join(":"), scopes);

  // Extract named values.
  return intersections.map(scope => {
    const values: { [name: string]: string } = Object.create(null);
    for (const [d, domain] of scope.split(":").entries()) {
      const domainExtractionPositions = extractionPositions.get(d);
      if (!domainExtractionPositions) continue;
      for (const [s, segment] of domain.split(".").entries()) {
        const name = domainExtractionPositions.get(s);
        if (!name) continue;
        values[name] = segment === "**" ? "*" : segment;
      }
    }

    return {
      scope,
      values
    };
  });
}
