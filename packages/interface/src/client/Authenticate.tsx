import React, { useState, useEffect, ReactElement } from "react";
import { useGraphQL, GraphQLFetchOptionsOverride } from "graphql-react";

import { Strategy } from "../Strategy";

export function Authenticate({
  setAuthorization,
  fetchOptionsOverride,
  strategies
}: {
  setAuthorization: (authorization: { id: string; secret: string }) => void;
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
  strategies: ReadonlyArray<Strategy>;
}): ReactElement<any> {
  const strategyFragments: string[] = [];
  const strategyFragmentNames: string[] = [];
  const strategyComponents: { [name: string]: Strategy["component"] } = {};
  strategies.forEach(strategy => {
    const match = strategy.fragment.match(
      /^\s*fragment\s+([A-Z][A-Za-z0-9_]*)\s+on\s+([A-Z][A-Za-z0-9_]*)/
    );

    if (!match || !match[1] || !match[2]) {
      throw new Error(
        `INVARIANT: Failed to extract fragment name from:\n${strategy.fragment}`
      );
    }

    if (strategyComponents[match[2]]) {
      throw new Error(
        `INVARIANT: A strategy is already registered for the type "${match[2]}".`
      );
    }

    strategyFragmentNames.push(match[1]);
    strategyFragments.push(strategy.fragment);
    strategyComponents[match[2]] = strategy.component;
  });

  // Inject strategy fragments into the query.
  const query = `
    query {
      authorities {
        edges {
          node {
            id

            ${strategyFragmentNames.map(name => {
              return `...${name}\n`;
            })}
          }
        }
      }
    }

    ${strategyFragments.map(fragment => `${fragment}\n\n`)}
  `;

  // Get all active authorities from the API.
  const { loading, cacheValue } = useGraphQL<any, {}>({
    fetchOptionsOverride,
    loadOnMount: true,
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
      cacheValue.data.authorities.edges &&
      cacheValue.data.authorities.edges
        .map((edge: any) => edge.node)
        .filter((authority: any) => authority)
        .sort((a: any, b: any) =>
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

  const StrategyComponent =
    authority && strategyComponents[authority.__typename];

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
      {(authority && StrategyComponent && (
        <StrategyComponent
          authority={authority}
          authorities={authorities}
          setAuthorization={setAuthorization}
        />
      )) || (
        <div className="panel">
          {loading ? (
            <p>Loading...</p>
          ) : !authorities.length ? (
            authorityId ? (
              cacheValue &&
              cacheValue.graphQLErrors &&
              cacheValue.graphQLErrors.length ? (
                cacheValue.graphQLErrors.map(({ message }, i) => (
                  <p className="error" key={i}>
                    {message}
                  </p>
                ))
              ) : (
                <p className="error">The authority failed to load.</p>
              )
            ) : (
              <p className="error">Unable to load authorities.</p>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
