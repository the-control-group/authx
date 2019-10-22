export {
  getDifference,
  getIntersection,
  hasIntersection,
  InvalidScopeError,
  isEqual,
  isStrictSubset,
  isStrictSuperset,
  isSubset,
  isSuperset,
  normalize,
  simplify,
  isValid
} from "./scope";

export { extract } from "./parameter";

import { isSuperset, hasIntersection, getIntersection, isValid } from "./scope";

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
 * {@link getIntersection}.
 */
export const validate = isValid;
