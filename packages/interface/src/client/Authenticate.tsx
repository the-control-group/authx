import React, { useState, useEffect, ReactElement } from "react";
import { useGraphQL, GraphQLFetchOptionsOverride } from "graphql-react";
import preval from "preval.macro";

const strategies = preval`module.exports=__STRATEGIES__.reduce(
  (map, p) => {
    const strategy = require(p).default;
    const match = strategy.fragment.match(
      /^\\s*fragment\\s+([A-Z][A-Za-z0-9_]*)/
    );
    if (!match || !match[1]) {
      throw new Error(
        \`INVARIANT: Failed to extract fragment name from:\\n\${strategy.fragment}\`
      );
    }
    map[match[1]] = strategy;

    console.log(match[1])
    return map;
  },
  {}
);
`;

console.log(strategies);

const query = `
  query {
    authorities {
      id

      ${Object.keys(strategies).map(name => {
        return `...${name}\n`;
      })}
    }
  }

  ${Object.values(strategies).map(({ fragment }) => `${fragment}\n\n`)}
`;

export function Authenticate({
  setAuthorization,
  fetchOptionsOverride
}: {
  setAuthorization: (authorization: { id: string; secret: string }) => void;
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
}): ReactElement<any> {
  // Get all active authorities from the API.
  const { loading, cacheValue } = useGraphQL<any, {}>({
    fetchOptionsOverride,
    operation: {
      variables: {},
      query
    }
  });

  // Sort authorities by name.
  const authorities: any[] =
    (cacheValue &&
      cacheValue.data &&
      cacheValue.data.authorities &&
      [...cacheValue.data.authorities].sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      )) ||
    [];

  // Set an active authority.
  const [authorityId, setAuthorityId] = useState<null | string>(
    new URL(window.location.href).searchParams.get("authorityId")
  );

  useEffect(() => {
    function onPopState(): void {
      const next = new URL(window.location.href).searchParams.get(
        "authorityId"
      );
      if (next) setAuthorityId(next);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function setActiveAuthorityId(id: string, name?: string): void {
    if (authorityId === id) return;
    const url = new URL(window.location.href);
    url.searchParams.set("authorityId", id);
    if (!authorityId)
      window.history.replaceState({}, name || "AuthX", url.href);
    else window.history.pushState({}, name || "AuthX", url.href);
    setAuthorityId(id);
  }

  if (authorities.length && authorityId === null) {
    const firstPasswordAuthority = authorities.find(
      a => a.__typename === "PasswordAuthority"
    );
    const authority = firstPasswordAuthority || authorities[0];
    setActiveAuthorityId(authority.id, authority.name || undefined);
  }

  const authority =
    (authorityId && authorities.find(a => a.id === authorityId)) || null;

  const Strategy =
    authority &&
    strategies[authority.__typename] &&
    strategies[authority.__typename].component;

  return (
    <div>
      <h1>Authenticate</h1>
      <div className="tabs">
        {authorities.map(a => (
          <div key={a.id} className={a.id === authorityId ? "active" : ""}>
            <button type="button" onClick={() => setActiveAuthorityId(a.id)}>
              {a.name}
            </button>
            <div />
          </div>
        ))}
      </div>
      {(authority && Strategy && (
        <Strategy
          authority={authority}
          authorities={authorities}
          setAuthorization={setAuthorization}
        />
      )) || (
        <div className="panel">
          {loading
            ? "Loading"
            : !authorities.length
            ? authorityId
              ? cacheValue &&
                cacheValue.graphQLErrors &&
                cacheValue.graphQLErrors.length
                ? cacheValue.graphQLErrors.map(({ message }, i) => (
                    <div className="error" key={i}>
                      {message}
                    </div>
                  ))
                : "The authority failed to load."
              : "Unable to load authorities."
            : null}
        </div>
      )}
    </div>
  );
}
