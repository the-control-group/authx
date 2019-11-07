import {
  Scope,
  AnySingle,
  AnyMultiple,
  getIntersection,
  isSuperset
} from "./scope";

export interface ParameterizedScope {
  scope: Scope;
  positions: Map<number, Map<number, string>>;
}

export function extract(
  { scope, positions }: ParameterizedScope,
  collection: Scope[]
): ReadonlyArray<{
  scope: Scope;
  parameters: {
    [key: string]: typeof AnySingle | string;
  };
}> {
  // Get the intersections.
  const intersections = getIntersection([scope], collection);

  // Extract parameters from each intersection.
  return intersections
    .filter(scope => isSuperset(collection, [scope]))
    .map(scope => {
      const parameters: {
        [name: string]: typeof AnySingle | string;
      } = Object.create(null);
      for (const [d, domain] of scope.entries()) {
        const domainParameterPositions = positions.get(d);
        if (!domainParameterPositions) continue;
        for (const [s, segment] of domain.entries()) {
          const name = domainParameterPositions.get(s);
          if (!name) continue;

          // Because a parameter represents a single segment, AnySingle will be
          // returned even if the scope includes an AnyMultiple.
          parameters[name] = segment === AnyMultiple ? AnySingle : segment;
        }
      }

      return {
        scope,
        parameters
      };
    });
}
