export {
  InvalidScopeError,
  InvalidValueError,
  MissingValueError,
  InvalidParameterizedScopeError,
  inject,
} from "./parse.js";

import * as PARAMETER from "./parameter.js";

import * as SCOPE from "./scope.js";
import {
  parseScopeLiteral,
  parseScopeTemplate,
  parseParameterizedScopeLiteral,
  parseParameterizedScopeTemplate,
  InvalidScopeError,
  InvalidParameterizedScopeError,
} from "./parse.js";
import { print } from "./print.js";

export function getDifference(
  collectionA: string[],
  collectionB: string[],
): string[] {
  return SCOPE.getDifference(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  ).map(print);
}

export function getIntersection(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): string[] {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.getIntersection(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  ).map(print);
}

export function hasIntersection(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): boolean {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.hasIntersection(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  );
}

export function isEqual(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): boolean {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.isEqual(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  );
}

export function isStrictSubset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): boolean {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.isStrictSubset(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  );
}

export function isStrictSuperset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): boolean {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.isStrictSuperset(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  );
}

export function isSubset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): boolean {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.isSubset(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  );
}

export function isSuperset(
  scopeOrCollectionA: string[] | string,
  scopeOrCollectionB: string[] | string,
): boolean {
  const collectionA =
    typeof scopeOrCollectionA === "string"
      ? [scopeOrCollectionA]
      : scopeOrCollectionA;

  const collectionB =
    typeof scopeOrCollectionB === "string"
      ? [scopeOrCollectionB]
      : scopeOrCollectionB;

  return SCOPE.isSuperset(
    collectionA.map(parseScopeTemplate),
    collectionB.map(parseScopeTemplate),
  );
}

export function isValidScopeLiteral(scope: string): boolean {
  try {
    parseScopeLiteral(scope);
    return true;
  } catch (error) {
    if (error instanceof InvalidScopeError) {
      return false;
    }

    throw error;
  }
}

export function isValidScopeTemplate(scope: string): boolean {
  try {
    parseScopeTemplate(scope);
    return true;
  } catch (error) {
    if (error instanceof InvalidScopeError) {
      return false;
    }

    throw error;
  }
}

export function isValidParameterizedScopeLiteral(scope: string): boolean {
  try {
    parseParameterizedScopeLiteral(scope);
    return true;
  } catch (error) {
    if (error instanceof InvalidParameterizedScopeError) {
      return false;
    }

    throw error;
  }
}

export function isValidParameterizedScopeTemplate(scope: string): boolean {
  try {
    parseParameterizedScopeTemplate(scope);
    return true;
  } catch (error) {
    if (error instanceof InvalidParameterizedScopeError) {
      return false;
    }

    throw error;
  }
}

export function normalize(scope: string): string;
export function normalize(collection: string[]): string[];
export function normalize(
  scopeOrCollection: string | string[],
): string | string[] {
  if (typeof scopeOrCollection !== "string") {
    return scopeOrCollection.map(normalize as (scope: string) => string);
  }

  return print(SCOPE.normalize(parseScopeTemplate(scopeOrCollection)));
}

export function simplify(collection: string[]): string[] {
  return SCOPE.simplify(collection.map(parseScopeTemplate)).map(print);
}

export function extract(
  scope: string,
  collection: string[],
): ReadonlyArray<{
  query: string;
  result: string;
  parameters: { [key: string]: string };
}> {
  return PARAMETER.extract(
    parseParameterizedScopeTemplate(scope),
    collection.map(parseScopeTemplate),
  ).map(({ query, result, parameters }) => ({
    query: print(query),
    result: print(result),
    parameters: Object.entries(parameters).reduce<{ [key: string]: string }>(
      (acc, [key, value]) => {
        acc[key] = value === SCOPE.AnySingle ? "*" : value;
        return acc;
      },
      {},
    ),
  }));
}
