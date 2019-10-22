import * as scope from "./scope";

export { extract } from "./parameter";
export { InvalidScopeError } from "./scope";

export function getDifference(
  collectionA: string[],
  collectionB: string[]
): string[] {
  if (!scope.isValidScopeTemplate(collectionA)) {
    throw new scope.InvalidScopeError(
      "A scope in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(collectionB)) {
    throw new scope.InvalidScopeError(
      "A scope in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.getDifference(collectionA, collectionB);
}

export function getIntersection(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): string[] {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.getIntersection(scopeOrCollectionA, scopeOrCollectionB);
}

export function hasIntersection(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.hasIntersection(scopeOrCollectionA, scopeOrCollectionB);
}

export function isEqual(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.isEqual(scopeOrCollectionA, scopeOrCollectionB);
}

export function isStrictSubset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.isStrictSubset(scopeOrCollectionA, scopeOrCollectionB);
}

export function isStrictSuperset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.isStrictSuperset(scopeOrCollectionA, scopeOrCollectionB);
}

export function isSubset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.isSubset(scopeOrCollectionA, scopeOrCollectionB);
}

export function isSuperset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string
): boolean {
  if (!scope.isValidScopeTemplate(scopeOrCollectionA)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionA` is invalid."
    );
  }

  if (!scope.isValidScopeTemplate(scopeOrCollectionB)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollectionB` is invalid."
    );
  }

  return scope.isSuperset(scopeOrCollectionA, scopeOrCollectionB);
}

export const isValidScopeTemplate = scope.isValidScopeTemplate;
export const isValidScope = scope.isValidScope;

export function normalize(scope: string): string;
export function normalize(collection: string[]): string[];
export function normalize(
  scopeOrCollection: string | string[]
): string | string[] {
  if (!scope.isValidScopeTemplate(scopeOrCollection)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `scopeOrCollection` is invalid."
    );
  }

  // This is a silly refinement to help typescript...
  return Array.isArray(scopeOrCollection)
    ? scope.normalize(scopeOrCollection)
    : scope.normalize(scopeOrCollection);
}

export function simplify(collection: string[]): string[] {
  if (!scope.isValidScopeTemplate(collection)) {
    throw new scope.InvalidScopeError(
      "One or more of the scopes in `collection` is invalid."
    );
  }

  return scope.simplify(collection);
}

// Deprecated
// -----------------------------------------------------------------------------

/**
 * @deprecated Since version 2.1. Will be deleted in version 3.0. Replace
 * "strict" calls with {@link isSuperset}, and weak mode with
 * {@link hasIntersection}.
 */
export function test(
  rule: string | string[],
  subject: string,
  strict: boolean = true
): boolean {
  return strict ? isSuperset(rule, subject) : hasIntersection(rule, subject);
}

/**
 * @deprecated Since version 2.1. Will be deleted in version 3.0. Replace
 * "strict" calls with {@link isSuperset}, and weak mode with
 * {@link hasIntersection}.
 */
export const can = test;

/**
 * @deprecated Since version 2.1. Will be deleted in version 3.0. Renamed to
 * {@link getIntersection}.
 */
export const limit = getIntersection;

/**
 * @deprecated Since version 2.4. Will be deleted in version 3.0. Renamed to
 * {@link isValidScope}.
 */
export const validate = isValidScope;
