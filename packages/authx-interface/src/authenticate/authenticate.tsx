import React, { useState, ComponentType, ReactElement } from "react";
import ReactDOM from "react-dom";
import { GraphQLContext, GraphQL, useGraphQL } from "graphql-react";
import { Authority, StrategyComponentProps } from "./definitions";

import { PasswordAuthority } from "./PasswordAuthority";
import { EmailAuthority } from "./EmailAuthority";

const graphql = new GraphQL();

const strategyComponentMap: {
  [strategy: string]: ComponentType<StrategyComponentProps>;
} = {
  password: PasswordAuthority,
  email: EmailAuthority
};

function Authenticate(): ReactElement<{}> {
  const { cacheValue } = useGraphQL<any, void>({
    fetchOptionsOverride(options: any) {
      options.url = "/graphql";
    },
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

  // sort authorities by name
  const authorities: Authority[] =
    (cacheValue &&
      cacheValue.data &&
      [...cacheValue.data.authorities].sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      )) ||
    [];

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
        <Strategy authority={authority} authorities={authorities} />
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
