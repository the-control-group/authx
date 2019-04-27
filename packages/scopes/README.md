[![Build Status](https://travis-ci.org/the-control-group/scopeutils.svg?branch=master)](https://travis-ci.org/the-control-group/scopeutils) [![Current version](https://badgen.net/npm/v/scopeutils)](https://www.npmjs.com/package/scopeutils) [![Supported Node.js versions](https://badgen.net/npm/node/scopeutils)](https://github.com/nodejs/Release)

# Scopes

This is a small collection of utility functions for AuthX scopes. These scopes are human-readable, fully OAuth2-compatible, and support both pattern matching and set algebra.

## Anatomy of a scope

Scopes are composed of 3 domains, separated by the `:` character:

```
AuthX:role.abc:read
|___| |______| |__|
  |      |       |
realm  resource  action

```

Each domain can contain segments, separated by the `.` character. Domain segments can be `/[a-zA-Z0-9_]*/` strings or glob pattern identifiers `*` or `**`:

```
role.abc
role.*
**
```

## Installation

Install with `npm install --save scopeutils`

## Usage

Please see [the tests](src/index.test.ts) for complete examples.

### `validate(scope: string): boolean`

Validate that a scope is correctly formatted.

```js
import { validate } from "scopeutils";

validate("realm:resource.identifier:action");
// => true

validate("realm:resource.***:action");
// => false
```

### `normalize(scope: string): string`

- **_throws `InvalidScopeError` if the scope is invalid._**

Normalize a scope into its simplest representation.

```js
import { normalize } from "scopeutils";

normalize("realm:**.**:action");
// => 'realm:*.**:action'
```

### `simplify(collection: string[]): string[]`

- **_throws `InvalidScopeError` if any scopes in `collection` are invalid._**

Simplify the collection of scopes in `collection` by omiting any scopes that are a made redundant by another scope in the collection. All scopes in the returned collection are normalized.

```js
import { simplify } from "scopeutils";

simplify(["realm:resource.*:action", "realm:**:action"]);
// => ['realm:**:action']
```

### `isEqual(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): boolean`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Check whether `scopeOrCollectionA` and `scopeOrCollectionB` are the same, ignoring redundant scopes.

```js
import { getIntersection } from "scopeutils";

getIntersection(["realm:**:*"], ["realm:**:action", "realm:**:*"]);
// => true
```

### `isSuperset(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): boolean`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Check whether `scopeOrCollectionA` is equal to, or a superset of `scopeOrCollectionB`. This is appropriate for checking if a user can perform a particular action.

```js
import { isSuperset } from "scopeutils";

isSuperset(["realm:**:*"], ["realm:**:action", "realm:**:*"]);
// => true
```

### `isStrictSuperset(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): boolean`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Check whether `scopeOrCollectionA` is a strict superset of `scopeOrCollectionB`.

```js
import { isStrictSuperset } from "scopeutils";

isStrictSuperset(["realm:**:*"], ["realm:**:action", "realm:**:*"]);
// => false
```

### `isSubset(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): boolean`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Check whether `scopeOrCollectionA` is equal to, or a subset of `scopeOrCollectionB`.

```js
import { isSubset } from "scopeutils";

isSubset(["realm:**:action", "realm:**:*"], ["realm:**:*"]);
// => true
```

### `isStrictSubset(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): boolean`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Check whether `scopeOrCollectionA` is a strict subset of `scopeOrCollectionB`.

```js
import { isStrictSubset } from "scopeutils";

isStrictSubset(["realm:**:action", "realm:**:*"], ["realm:**:*"]);
// => false
```

### `getIntersection(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): string[]`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Get the intersection of `scopeOrCollectionA` and `scopeOrCollectionB`, returning a collection of scopes that represent all intersections, or every ability common to both inputs.

```js
import { getIntersection } from "scopeutils";

getIntersection(["realm:resource.*:action.*"], ["realm:**:action.read"]);
// => ['realm:resource.*:action.read']
```

### `hasIntersection(scopeOrCollectionA: string[] | string, scopeOrCollectionB: string[] | string): string[]`

- **_throws `InvalidScopeError` if any scopes in `scopeOrCollectionA` or `scopeOrCollectionB` are invalid._**

Check whether `scopeOrCollectionA` and `scopeOrCollectionB` intersect. This is useful when checking if a user can perform any subset of the actions represented by the `subject` scope.

```js
import { hasIntersection } from "scopeutils";

hasIntersection(["realm:resource.*:action.*"], ["realm:**:action.read"]);
// => true
```
