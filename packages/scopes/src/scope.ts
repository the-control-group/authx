import {
  Domain,
  getIntersection as getDomainIntersection,
  isSuperset as domainIsSuperset,
  compare as compareDomain,
  normalize as normalizeDomain
} from "./domain";

export { Domain, Segment, AnySingle, AnyMultiple } from "./domain";

export type Scope = Domain[];

function intersect(left: Scope, rightA: Scope, rightB: Scope): Scope[] {
  // INVARIENT: rightA.length === rightB.length
  // INVARIENT: rightA.length > 0
  // INVARIENT: rightB.length > 0

  const [a, ...restA] = rightA;
  const [b, ...restB] = rightB;

  if (!restA.length) {
    return getDomainIntersection(a, b).map(domain => [...left, domain]);
  }

  return getDomainIntersection(a, b)
    .map(domain => intersect([...left, domain], restA, restB))
    .reduce((x, y) => [...x, ...y], []);
}

export function normalize(scope: Scope): Scope {
  return scope.map(normalizeDomain);
}

export function compare(scopeA: Scope, scopeB: Scope): number {
  if (scopeA === scopeB) return 0;
  const domainLength = Math.max(scopeA.length, scopeB.length);
  for (let iDomain = 0; iDomain < domainLength; iDomain++) {
    const domainA = scopeA[iDomain];
    const domainB = scopeB[iDomain];
    if (domainA === domainB) continue;
    if (domainA === undefined) return 1;
    if (domainB === undefined) return -1;

    const domainResult = compareDomain(domainA, domainB);
    if (domainResult === 0) {
      continue;
    }

    return domainResult;
  }

  return 0;
}

function s(winners: Scope[], candidate: Scope): Scope[] {
  if (isSuperset(winners, [candidate])) {
    return winners;
  }

  return [...winners, normalize(candidate)];
}

// returns a de-duplicated array of scope rules
export function simplify(collection: Scope[]): Scope[] {
  return collection
    .reduce(s, [])
    .reduceRight(s, [])
    .sort(compare);
}

export function getIntersection(
  collectionA: Scope[],
  collectionB: Scope[]
): Scope[] {
  return simplify(
    collectionA
      .map(a =>
        collectionB
          .map(b => intersect([], a, b))
          .reduce((x, y) => [...x, ...y], [])
      )
      .reduce((x, y) => [...x, ...y], [])
  );
}

export function hasIntersection(
  collectionA: Scope[],
  collectionB: Scope[]
): boolean {
  return getIntersection(collectionA, collectionB).length > 0;
}

export function isEqual(collectionA: Scope[], collectionB: Scope[]): boolean {
  const simplifiedCollectionA = simplify(collectionA);
  const simplifiedCollectionB = simplify(collectionB);
  if (simplifiedCollectionA.length !== simplifiedCollectionB.length) {
    return false;
  }

  for (const [iScope, scopeA] of simplifiedCollectionA.entries()) {
    const scopeB = simplifiedCollectionB[iScope];
    if (scopeA.length !== scopeB.length) {
      return false;
    }

    for (const [iDomain, domainA] of scopeA.entries()) {
      const domainB = scopeB[iDomain];
      if (domainA.length !== domainB.length) {
        return false;
      }

      for (const [iSegment, segmentA] of domainA.entries()) {
        const segmentB = domainB[iSegment];
        if (segmentA !== segmentB) {
          return false;
        }
      }
    }
  }

  return true;
}

export function getDifference(
  collectionA: Scope[],
  collectionB: Scope[]
): Scope[] {
  return collectionA.reduce((remaining, a) => {
    return remaining.filter(
      b =>
        a.length !== b.length ||
        a.some((domainA: Domain, i: number) => !domainIsSuperset(domainA, b[i]))
    );
  }, collectionB);
}

export function isSuperset(
  collectionA: Scope[],
  collectionB: Scope[]
): boolean {
  return getDifference(collectionA, collectionB).length === 0;
}

export function isStrictSuperset(
  collectionA: Scope[],
  collectionB: Scope[]
): boolean {
  return (
    !isEqual(collectionA, collectionB) && isSuperset(collectionA, collectionB)
  );
}

export function isSubset(collectionA: Scope[], collectionB: Scope[]): boolean {
  return isSuperset(collectionB, collectionA);
}

export function isStrictSubset(
  collectionA: Scope[],
  collectionB: Scope[]
): boolean {
  return (
    !isEqual(collectionA, collectionB) && isSubset(collectionA, collectionB)
  );
}
