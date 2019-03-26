import { useEffect, useCallback, useContext } from "react";
import {
  GraphQLContext,
  GraphQLCacheValue,
  GraphQLFetchOptions,
  GraphQLFetchOptionsOverride
} from "graphql-react";

interface Token {
  id: string;
  secret: string;
}

export function useAuthenticatedEndpoint(
  token: null | Token,
  clearToken: () => void
): { fetchOptionsOverride: GraphQLFetchOptionsOverride } {
  const graphql = useContext(GraphQLContext);
  if (!graphql)
    throw new Error(
      "The hook `useAuthenticatedEndpoint` must only be called inside a `GraphQLContext`."
    );

  // Clear token if we get a 401 from the server
  useEffect(() => {
    if (!token) return;

    async function onFetch({
      cacheValuePromise: request
    }: {
      cacheValuePromise: Promise<GraphQLCacheValue<any>>;
    }): Promise<void> {
      try {
        const response = await request;
        if (response.httpError && response.httpError.status === 401) {
          clearToken();
        }
      } catch (error) {
        console.error(error);
      }
    }

    graphql.on("fetch", onFetch);
    return () => graphql.off("fetch", onFetch);
  }, [token, clearToken, graphql]);

  // Set Authorization header in fetch options
  const fetchOptionsOverride = useCallback(
    (options: GraphQLFetchOptions) => {
      options.url = "/graphql";
      if (token) {
        options.headers =
          options.headers instanceof Headers
            ? options.headers
            : new Headers(options.headers);
        options.headers.append(
          "Authorization",
          `Basic ${btoa(`${token.id}:${token.secret}`)}`
        );
      }
    },
    [token]
  );

  return { fetchOptionsOverride };
}
