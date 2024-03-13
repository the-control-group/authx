import {
  Scope,
  AnySingle,
  AnyMultiple,
  getIntersection,
  isSuperset,
} from "./scope.js";

export interface ParameterizedScope {
  scope: Scope;
  positions: Map<number, Map<number, string>>;
}

export function extract(
  { scope: query, positions }: ParameterizedScope,
  collection: Scope[],
): ReadonlyArray<{
  query: Scope;
  result: Scope;
  parameters: {
    [key: string]: typeof AnySingle | string;
  };
}> {
  const finish: {
    query: Scope;
    result: Scope;
    parameters: {
      [key: string]: typeof AnySingle | string;
    };
  }[] = [];

  // Get the intersections.
  const intersections = getIntersection([query], collection);

  // Extract parameters from each intersection.
  for (const intersection of intersections) {
    const parameters: {
      [name: string]: typeof AnySingle | string;
    } = Object.create(null);

    const result: Scope = [];

    for (const [d, domain] of intersection.entries()) {
      const domainParameterPositions = positions.get(d);
      result[d] = [];

      for (const [s, segment] of domain.entries()) {
        const name =
          domainParameterPositions && domainParameterPositions.get(s);

        if (!name) {
          result[d][s] = query[d][s];
          continue;
        }

        // Because a parameter represents a single segment, AnySingle will be
        // returned even if the scope includes an AnyMultiple.
        parameters[name] = segment === AnyMultiple ? AnySingle : segment;
        result[d][s] = segment;
      }
    }

    if (!isSuperset(collection, [result])) {
      continue;
    }

    finish.push({
      query,
      result,
      parameters,
    });
  }
  return finish;
}
