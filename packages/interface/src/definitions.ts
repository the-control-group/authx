import { GraphQLFetchOptions } from "graphql-react";

export interface Authority {
  id: string;
  strategy: string;
  name: string;
}

export interface StrategyComponentProps {
  fetchOptionsOverride: (options: GraphQLFetchOptions) => void;
  authority: Authority;
  authorities: Authority[];
  setAuthorization: (authorization: { id: string; secret: string }) => void;
  redirect: null | (() => void);
}
