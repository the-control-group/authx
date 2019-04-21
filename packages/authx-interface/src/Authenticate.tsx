import React, { useState, useEffect, ComponentType, ReactElement } from "react";
import { useGraphQL, GraphQLFetchOptionsOverride } from "graphql-react";
import { Authority, StrategyComponentProps } from "./definitions";
import { PasswordAuthority } from "./PasswordAuthority";
import { EmailAuthority } from "./EmailAuthority";

const strategyComponentMap: {
  [strategy: string]: ComponentType<StrategyComponentProps>;
} = {
  password: PasswordAuthority,
  email: EmailAuthority
};

export function Authenticate({
  setToken,
  fetchOptionsOverride
}: {
  setToken: (token: { id: string; secret: string }) => void;
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
}): ReactElement<any> {
  // Get all active authorities from the API.
  const { loading, cacheValue } = useGraphQL<any, {}>({
    fetchOptionsOverride,
    operation: {
      variables: {},
      query: `
        query {
          authorities {
            id
            strategy
            name
          }  
        }
      `
    }
  });

  // Sort authorities by name.
  const authorities: Authority[] =
    (cacheValue &&
      cacheValue.data &&
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
      a => a.strategy === "password"
    );
    const authority = firstPasswordAuthority || authorities[0];
    setActiveAuthorityId(authority.id, authority.name);
  }
  const authority =
    (authorityId && authorities.find(a => a.id === authorityId)) || null;
  const Strategy =
    (authority && strategyComponentMap[authority.strategy]) || null;

  const redirect = null;

  return (
    <div>
      <h1>Authenticate</h1>
      <div className="tabs">
        {authorities
          .filter(a => typeof strategyComponentMap[a.strategy] !== "undefined")
          .map(a => (
            <div key={a.id} className={a.id === authorityId ? "active" : ""}>
              <button type="button" onClick={() => setActiveAuthorityId(a.id)}>
                {a.name}
              </button>
              <div />
            </div>
          ))}
      </div>
      {authority && Strategy ? (
        <Strategy
          fetchOptionsOverride={fetchOptionsOverride}
          redirect={redirect}
          authority={authority}
          authorities={authorities}
          setToken={setToken}
        />
      ) : (
        <div className="panel">
          {loading
            ? "Loading"
            : !authorities.length
            ? authorityId
              ? "The authority failed to load."
              : "Unable to load authorities."
            : null}
        </div>
      )}
    </div>
  );
}
