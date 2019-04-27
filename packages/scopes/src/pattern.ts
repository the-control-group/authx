export const AnySingle: unique symbol = Symbol("*");
export const AnyMultiple: unique symbol = Symbol("**");

export type Segment = string | typeof AnySingle | typeof AnyMultiple;
export type Pattern = Segment[];

function superset(left: Pattern, rightA: Pattern, rightB: Pattern): boolean {
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

  const match: null | Pattern =
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

  // DONE: Both patterns are finished.
  if (!restA.length && !restB.length) {
    return Boolean(match);
  }

  // DONE: The patterns have different cardinality.
  if (!restA.length || !restB.length) {
    return false;
  }

  // CONTINUE
  return superset(match, restA, restB);
}

function intersect(left: Pattern, rightA: Pattern, rightB: Pattern): Pattern[] {
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
            ] as Pattern[])
          : !restA.length || b === AnyMultiple // DONE
          ? [[...left, b, ...restA]]
          : []
        : []),

      ...(b === AnyMultiple
        ? restA.length // CONTINUE
          ? ([
              ...intersect([...left, a], restA, [b, ...restB]),
              ...(restB.length ? intersect([...left, a], restA, restB) : [])
            ] as Pattern[])
          : !restB.length || a === AnyMultiple // DONE
          ? [[...left, a, ...restB]]
          : []
        : [])
    ] as Pattern[];
  }

  const match: null | Pattern =
    a === AnySingle || b === AnySingle
      ? [...left, a == AnySingle ? b : a]
      : a == b
      ? [...left, a]
      : null;

  // DONE: The segments do not match
  if (!match) {
    return [];
  }

  // DONE: Both patterns are finished.
  if (!restA.length && !restB.length) {
    return [match];
  }

  // DONE: The patterns have different cardinality.
  if (!restA.length || !restB.length) {
    return [];
  }

  // CONTINUE
  return intersect(match, restA, restB);
}

function s(winners: Pattern[], candidate: Pattern): Pattern[] {
  if (
    candidate.length < 1 ||
    winners.some(pattern => isSuperset(pattern, candidate))
  ) {
    return winners;
  }

  return [...winners, candidate];
}

function simplify(collection: Pattern[]): Pattern[] {
  return collection.reduce(s, []).reduceRight(s, []);
}

export function compare(a: Pattern, b: Pattern): 0 | -1 | 1 {
  for (let i = 0; i < a.length; i++) {
    if (i > b.length) {
      return 1;
    }

    const segmentA: Segment = a[i];
    const segmentB: Segment = b[i];

    if (segmentA === segmentB) {
      continue;
    }

    if (segmentA === AnySingle) return -1;
    if (segmentB === AnySingle) return 1;
    if (segmentA === AnyMultiple) return -1;
    if (segmentB === AnyMultiple) return 1;
    return segmentA > segmentB ? 1 : -1;
  }

  return a.length < b.length ? -1 : 0;
}

export function normalize(pattern: Pattern): Pattern {
  return pattern.map((segment, i, segments) => {
    if (
      segment !== AnyMultiple ||
      (segments[i + 1] !== AnyMultiple && segments[i + 1] !== AnySingle)
    ) {
      return segment;
    }

    segments[i + 1] = AnyMultiple;
    return AnySingle;
  });
}

export function getIntersection(a: Pattern, b: Pattern): Pattern[] {
  a = normalize(a);
  b = normalize(b);

  if (a.length < 1 || b.length < 1) {
    return [];
  }

  return simplify(intersect([], a, b));
}

export function isEqual(a: Pattern, b: Pattern): boolean {
  a = normalize(a);
  b = normalize(b);
  return a.length === b.length && a.every((segment, i) => segment === b[i]);
}

export function isSubset(a: Pattern, b: Pattern): boolean {
  return isSuperset(b, a);
}

export function isStrictSubset(a: Pattern, b: Pattern): boolean {
  if (isEqual(a, b)) {
    return false;
  }

  return isSubset(a, b);
}

export function isSuperset(a: Pattern, b: Pattern): boolean {
  a = normalize(a);
  b = normalize(b);
  return superset([], a, b);
}

export function isStrictSuperset(a: Pattern, b: Pattern): boolean {
  return isStrictSubset(b, a);
}
