import {
  Domain,
  AnySingle,
  AnyMultiple,
  getIntersection as domainGetIntersection,
  isSuperset as domainIsSuperset
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
    return domainGetIntersection(a, b).map(domain => [...left, domain]);
  }

  return domainGetIntersection(a, b)
    .map(domain => intersect([...left, domain], restA, restB))
    .reduce((x, y) => x.concat(y), []);
}

export function normalize(scope: Scope): Scope {
  return scope.map(domain =>
    domain.map((segment, i, segments) => {
      if (
        segment !== AnyMultiple ||
        (segments[i + 1] !== AnyMultiple && segments[i + 1] !== AnySingle)
      )
        return segment;
      segments[i + 1] = AnyMultiple;
      return AnySingle;
    })
  );
}

function s(winners: Scope[], candidate: Scope): Scope[] {
  if (!isSuperset(winners, [candidate])) {
    winners.push(normalize(candidate));
  }

  return winners;
}

function sort(scopeA: Scope, scopeB: Scope): number {
  if (scopeA === scopeB) return 0;
  const domainLength = Math.max(scopeA.length, scopeB.length);
  for (let iDomain = 0; iDomain < domainLength; iDomain++) {
    const domainA = scopeA[iDomain];
    const domainB = scopeB[iDomain];
    if (domainA === domainB) continue;
    if (domainA === undefined) return 1;
    if (domainB === undefined) return -1;

    const segmentLength = Math.max(domainA.length, domainB.length);
    for (let iSegment = 0; iSegment < segmentLength; iSegment++) {
      const segmentA = domainA[iSegment];
      const segmentB = domainB[iSegment];
      if (segmentA === segmentB) continue;
      if (segmentA === AnyMultiple) return -1;
      if (segmentB === AnyMultiple) return 1;
      if (segmentA === AnySingle) return -1;
      if (segmentB === AnySingle) return 1;
      if (segmentA === undefined) return 1;
      if (segmentB === undefined) return -1;
      return segmentA < segmentB ? -1 : 1;
    }
  }

  return 0;
}

// returns a de-duplicated array of scope rules
export function simplify(collection: Scope[]): Scope[] {
  return collection
    .reduce(s, [])
    .reduceRight(s, [])
    .sort(sort);
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
          .reduce((x, y) => x.concat(y), [])
      )
      .reduce((x, y) => x.concat(y), [])
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
    for (const [iDomain, domainA] of scopeA.entries()) {
      for (const [iSegment, segmentA] of domainA.entries()) {
        if (segmentA !== simplifiedCollectionB[iScope][iDomain][iSegment]) {
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
