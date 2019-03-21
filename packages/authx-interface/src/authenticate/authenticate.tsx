import React, {
  useState,
  useEffect,
  useCallback,
  ComponentType,
  ReactElement
} from "react";
import ReactDOM from "react-dom";
import {
  GraphQLContext,
  GraphQL,
  useGraphQL,
  GraphQLFetchOptions
} from "graphql-react";
import { Authority, StrategyComponentProps } from "./definitions";

import { PasswordAuthority } from "./PasswordAuthority";
import { EmailAuthority } from "./EmailAuthority";
import { Token } from "./Token";

const graphql = new GraphQL();

const strategyComponentMap: {
  [strategy: string]: ComponentType<StrategyComponentProps>;
} = {
  password: PasswordAuthority,
  email: EmailAuthority
};

function Authenticate({  }: {}): ReactElement<any> {
  // Get the current token from localStorage.
  const [tokenId, tokenSecret] = (
    window.localStorage.getItem("token") || ":"
  ).split(":");
  const [token, setToken] = useState<null | { id: string; secret: string }>(
    tokenId && tokenSecret ? { id: tokenId, secret: tokenSecret } : null
  );

  // Listen for changes to the token in localStorage
  useEffect(() => {
    function onChange(e: StorageEvent): void {
      console.log(e);
      if (e.key === "token") {
        const [tokenId, tokenSecret] = (e.newValue || "null").split(":");
        if (
          tokenId &&
          tokenSecret &&
          (!token || token.id !== tokenId || token.secret !== tokenSecret)
        ) {
          setToken({ id: tokenId, secret: tokenSecret });
        }
      }
    }

    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
    };
  }, [token, setToken]);

  const fetchOptionsOverride = useCallback(
    (options: GraphQLFetchOptions) => {
      options.url = "/graphql";
      if (token) {
        options.headers = new Headers();
        options.headers.append("Content-Type", `application/json`);
        options.headers.append(
          "Authorization",
          `Basic ${btoa(`${token.id}:${token.secret}`)}`
        );
      }
    },
    [token]
  );

  // Get all active authorities from the API.
  const { cacheValue } = useGraphQL<any, void>({
    fetchOptionsOverride,
    operation: {
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
  const [authorityId, setActiveAuthorityId] = useState<null | string>(null);
  if (authorities.length && authorityId === null) {
    const firstPasswordAuthority = authorities.find(
      a => a.strategy === "password"
    );
    setActiveAuthorityId(
      (firstPasswordAuthority && firstPasswordAuthority.id) || authorities[0].id
    );
  }
  const authority =
    (authorityId && authorities.find(a => a.id === authorityId)) || null;
  const Strategy =
    (authority && strategyComponentMap[authority.strategy]) || null;

  const redirect = null;

  // We are already logged in
  if (token) {
    return (
      <div>
        <h1>Authenticate</h1>
        <div className="tabs">
          <div>
            <div />
          </div>
        </div>
        <Token
          fetchOptionsOverride={fetchOptionsOverride}
          redirect={redirect}
          token={token}
          clearToken={() => {
            window.localStorage.removeItem("token");
            setToken(null);
          }}
        />
      </div>
    );
  }

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
          setToken={token => {
            window.localStorage.setItem("token", `${token.id}:${token.secret}`);
            setToken(token);
          }}
        />
      ) : null}
    </div>
  );
}

ReactDOM.render(
  <GraphQLContext.Provider value={graphql}>
    <Authenticate />
  </GraphQLContext.Provider>,
  document.getElementById("root")
);
