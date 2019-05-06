import { useEffect, useCallback, useContext } from "react";
import {
  GraphQLContext,
  GraphQLCacheValue,
  GraphQLFetchOptions,
  GraphQLFetchOptionsOverride
} from "graphql-react";

interface Authorization {
  id: string;
  secret: string;
}

export function useAuthenticatedEndpoint(
  authorization: null | Authorization,
  clearAuthorization: () => void
): { fetchOptionsOverride: GraphQLFetchOptionsOverride } {
  const graphql = useContext(GraphQLContext);
  if (!graphql)
    throw new Error(
      "The hook `useAuthenticatedEndpoint` must only be called inside a `GraphQLContext`."
    );

  // Clear authorization if we get a 401 from the server
  useEffect(() => {
    if (!authorization) return;

    async function onCache({
      cacheValue
    }: {
      cacheValue: GraphQLCacheValue<any>;
    }): Promise<void> {
      if (cacheValue.httpError && cacheValue.httpError.status === 401) {
        clearAuthorization();
      }
    }

    graphql.on("cache", onCache);
    return () => graphql.off("cache", onCache);
  }, [authorization, clearAuthorization, graphql]);

  // Set Authorization header in fetch options
  const fetchOptionsOverride = useCallback(
    (options: GraphQLFetchOptions) => {
      options.url = "/graphql";
      if (authorization) {
        options.headers =
          options.headers instanceof Headers
            ? options.headers
            : new Headers(options.headers);
        options.headers.append(
          "Authorization",
          `Basic ${btoa(`${authorization.id}:${authorization.secret}`)}`
        );
      }
    },
    [authorization]
  );

  return { fetchOptionsOverride };
}
