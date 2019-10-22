import * as pattern from "./pattern";

export class InvalidScopeError extends Error {}

// Parse a scope string into a pattern.Pattern array
function parse(scope: string): pattern.Pattern[] {
  return scope.split(":").map(domain =>
    domain.split(".").map(segment => {
      switch (segment) {
        case "**":
          return pattern.AnyMultiple;
        case "*":
          return pattern.AnySingle;
        default:
          return segment;
      }
    })
  );
}

// Stringify a pattern.Pattern array
function stringify(scope: pattern.Pattern[]): string {
  return scope
    .map(domain =>
      domain
        .map(segment => {
          switch (segment) {
            case pattern.AnyMultiple:
              return "**";
            case pattern.AnySingle:
              return "*";
            default:
              return segment;
          }
        })
        .join(".")
    )
    .join(":");
}

function intersect(
  left: pattern.Pattern[],
  rightA: pattern.Pattern[],
  rightB: pattern.Pattern[]
): pattern.Pattern[][] {
  // INVARIENT: rightA.length === rightB.length
  // INVARIENT: rightA.length > 0
  // INVARIENT: rightB.length > 0

  const [a, ...restA] = rightA;
  const [b, ...restB] = rightB;

  if (!restA.length) {
    return pattern.getIntersection(a, b).map(pattern => [...left, pattern]);
  }

  return pattern
    .getIntersection(a, b)
    .map(pattern => intersect([...left, pattern], restA, restB))
    .reduce((x, y) => x.concat(y), []);
}

export function isValid(scopeOrCollection: string | string[]): boolean {
  if (Array.isArray(scopeOrCollection)) {
    return scopeOrCollection.every(isValid);
  }

  const patterns = scopeOrCollection.split(":");
  return (
    patterns.length === 3 &&
    patterns.every(pattern =>
      pattern
        .split(".")
        .every(
          segment =>
            segment === "" ||
            segment === "*" ||
            segment === "**" ||
            /^[a-zA-Z0-9_-]+$/.test(segment)
        )
    )
  );
}

export function normalize(scope: string): string;
export function normalize(collection: string[]): string[];
export function normalize(
  scopeOrCollection: string | string[]
): string | string[] {
  // INVARIENT: scopeOrCollection contains only valid scopes

  if (Array.isArray(scopeOrCollection)) {
    return scopeOrCollection.map(s => normalize(s));
  }

  return scopeOrCollection
    .split(":")
    .map(domain =>
      domain
        .split(".")
        .map((segment, i, segments) => {
          if (
            segment !== "**" ||
            (segments[i + 1] !== "**" && segments[i + 1] !== "*")
          )
            return segment;
          segments[i + 1] = "**";
          return "*";
        })
        .join(".")
    )
    .join(":");
}

function s(winners: string[], candidate: string): string[] {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes

  if (isSuperset(winners, candidate)) return winners;
  return winners.concat(normalize(candidate));
}

// returns a de-duplicated array of scope rules
export function simplify(collection: string[]): string[] {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes

  return collection
    .reduce(s, [])
    .reduceRight(s, [])
    .sort();
}

export function getIntersection(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): string[] {
  // INVARIENT: scopeOrCollectionA contains only valid scopes
  // INVARIENT: scopeOrCollectionB contains only valid scopes

  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  const patternsA = collectionA.map(parse).filter(p => p.length > 0);
  const patternsB = collectionB.map(parse).filter(p => p.length > 0);

  return simplify(
    patternsA
      .map(a =>
        patternsB
          .map(b => intersect([], a, b))
          .reduce((x, y) => x.concat(y), [])
      )
      .reduce((x, y) => x.concat(y), [])
      .map(stringify)
  );
}

export function hasIntersection(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  // INVARIENT: scopeOrCollectionA contains only valid scopes
  // INVARIENT: scopeOrCollectionB contains only valid scopes

  return getIntersection(scopeOrCollectionA, scopeOrCollectionB).length > 0;
}

export function isEqual(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  // INVARIENT: scopeOrCollectionA contains only valid scopes
  // INVARIENT: scopeOrCollectionB contains only valid scopes

  const collectionA = simplify(
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA
  );
  const collectionB = simplify(
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB
  );

  return (
    collectionA.length === collectionB.length &&
    collectionA.every((a, i) => a === collectionB[i])
  );
}

export function getDifference(
  collectionA: string[],
  collectionB: string[]
): string[] {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes

  const parsedCollectionA = collectionA.map(parse);
  const parsedCollectionB = collectionB.map(parse);

  return parsedCollectionA
    .reduce((remaining, a) => {
      return remaining.filter(
        b =>
          a.length !== b.length ||
          a.some(
            (patternA: pattern.Pattern, i: number) =>
              !pattern.isSuperset(patternA, b[i])
          )
      );
    }, parsedCollectionB)
    .map(stringify);
}

export function isSuperset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes

  return (
    getDifference(
      Array.isArray(scopeOrCollectionA)
        ? scopeOrCollectionA
        : [scopeOrCollectionA],
      Array.isArray(scopeOrCollectionB)
        ? scopeOrCollectionB
        : [scopeOrCollectionB]
    ).length === 0
  );
}

export function isStrictSuperset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes

  return (
    !isEqual(scopeOrCollectionA, scopeOrCollectionB) &&
    isSuperset(scopeOrCollectionA, scopeOrCollectionB)
  );
}

export function isSubset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes

  return isSubset(scopeOrCollectionB, scopeOrCollectionA);
}

export function isStrictSubset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  // INVARIENT: parsedCollectionA contains only valid scopes
  // INVARIENT: parsedCollectionB contains only valid scopes
  return (
    !isEqual(scopeOrCollectionA, scopeOrCollectionB) &&
    isSubset(scopeOrCollectionA, scopeOrCollectionB)
  );
}
