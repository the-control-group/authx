export const AnySingle: unique symbol = Symbol("*");
export const AnyMultiple: unique symbol = Symbol("**");

export type Segment = string | typeof AnySingle | typeof AnyMultiple;
export type Domain = Segment[];

function superset(left: Domain, rightA: Domain, rightB: Domain): boolean {
  // INVARIENT: rightA.length > 0
  // INVARIENT: rightB.length > 0
  const [a, ...restA] = rightA;
  const [b, ...restB] = rightB;

  // One or both segments have variable cardinality.
  if (a === AnyMultiple) {
    return restB.length // CONTINUE
      ? superset([...left, b], [a, ...restA], restB) ||
          (Boolean(restA.length) && superset([...left, b], restA, restB))
      : !restA.length; // DONE
  }

  const match: null | Domain =
    a === AnySingle
      ? b === AnyMultiple
        ? null
        : [...left, b]
      : a == b
      ? [...left, a]
      : null;

  // DONE: The segments do not match
  if (!match) {
    return false;
  }

  // DONE: Both domains are finished.
  if (!restA.length && !restB.length) {
    return Boolean(match);
  }

  // DONE: The domains have different cardinality.
  if (!restA.length || !restB.length) {
    return false;
  }

  // CONTINUE
  return superset(match, restA, restB);
}

function intersect(left: Domain, rightA: Domain, rightB: Domain): Domain[] {
  // INVARIENT: rightA.length > 0
  // INVARIENT: rightB.length > 0
  const [a, ...restA] = rightA;
  const [b, ...restB] = rightB;

  // One or both segments have variable cardinality.
  if (a === AnyMultiple || b === AnyMultiple) {
    return [
      ...(a === AnyMultiple
        ? restB.length // CONTINUE
          ? ([
              ...intersect([...left, b], [a, ...restA], restB),
              ...(restA.length ? intersect([...left, b], restA, restB) : [])
            ] as Domain[])
          : !restA.length || b === AnyMultiple // DONE
          ? [[...left, b, ...restA]]
          : []
        : []),

      ...(b === AnyMultiple
        ? restA.length // CONTINUE
          ? ([
              ...intersect([...left, a], restA, [b, ...restB]),
              ...(restB.length ? intersect([...left, a], restA, restB) : [])
            ] as Domain[])
          : !restB.length || a === AnyMultiple // DONE
          ? [[...left, a, ...restB]]
          : []
        : [])
    ] as Domain[];
  }

  const match: null | Domain =
    a === AnySingle || b === AnySingle
      ? [...left, a == AnySingle ? b : a]
      : a == b
      ? [...left, a]
      : null;

  // DONE: The segments do not match
  if (!match) {
    return [];
  }

  // DONE: Both domains are finished.
  if (!restA.length && !restB.length) {
    return [match];
  }

  // DONE: The domains have different cardinality.
  if (!restA.length || !restB.length) {
    return [];
  }

  // CONTINUE
  return intersect(match, restA, restB);
}

function s(winners: Domain[], candidate: Domain): Domain[] {
  if (
    candidate.length < 1 ||
    winners.some(domain => isSuperset(domain, candidate))
  ) {
    return winners;
  }

  return [...winners, candidate];
}

function simplify(collection: Domain[]): Domain[] {
  return collection.map(normalize).reduce(s, []).reduceRight(s, []);
}

export function compare(a: Domain, b: Domain): 0 | -1 | 1 {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const segmentA = a[i];
    const segmentB = b[i];
    if (segmentA === segmentB) continue;
    if (segmentA === AnyMultiple) return -1;
    if (segmentB === AnyMultiple) return 1;
    if (segmentA === AnySingle) return -1;
    if (segmentB === AnySingle) return 1;
    if (segmentA === undefined) return 1;
    if (segmentB === undefined) return -1;
    return segmentA < segmentB ? -1 : 1;
  }

  return 0;
}

export function normalize(domain: Domain): Domain {
  const normalized: Domain = [];

  for (const [i, segment] of domain.entries()) {
    if (
      (segment === AnyMultiple || segment === AnySingle) &&
      normalized[i - 1] === AnyMultiple
    ) {
      normalized[i - 1] = AnySingle;
      normalized[i] = AnyMultiple;
      continue;
    }

    normalized[i] = segment;
  }

  return normalized;
}

export function getIntersection(a: Domain, b: Domain): Domain[] {
  a = normalize(a);
  b = normalize(b);

  if (a.length < 1 || b.length < 1) {
    return [];
  }

  return simplify(intersect([], a, b));
}

export function isEqual(a: Domain, b: Domain): boolean {
  a = normalize(a);
  b = normalize(b);
  return a.length === b.length && a.every((segment, i) => segment === b[i]);
}

export function isSubset(a: Domain, b: Domain): boolean {
  return isSuperset(b, a);
}

export function isStrictSubset(a: Domain, b: Domain): boolean {
  if (isEqual(a, b)) {
    return false;
  }

  return isSubset(a, b);
}

export function isSuperset(a: Domain, b: Domain): boolean {
  a = normalize(a);
  b = normalize(b);
  return superset([], a, b);
}

export function isStrictSuperset(a: Domain, b: Domain): boolean {
  return isStrictSubset(b, a);
}
