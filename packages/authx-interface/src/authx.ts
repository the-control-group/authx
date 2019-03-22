import { useMemo, useContext, useState, useEffect, useCallback } from "react";
import {
  GraphQLContext,
  GraphQL,
  GraphQLFetchOptions,
  GraphQLFetchOptionsOverride,
  GraphQLCacheValue
} from "graphql-react";

export function useAuthX(): {
  token: null | { id: string; secret: string };
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
  clearToken: () => void;
  setToken: (token: { id: string; secret: string }) => void;
} {
  // Get the current token from localStorage.
  const [token, setToken] = useState<null | { id: string; secret: string }>(
    useMemo(() => {
      const [tokenId, tokenSecret] = (
        window.localStorage.getItem("token") || ":"
      ).split(":");

      return tokenId && tokenSecret
        ? { id: tokenId, secret: tokenSecret }
        : null;
    }, [])
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

  // If any request returns a 401, we know that the token is no longer valid.
  const graphql = useContext<GraphQL>(GraphQLContext);
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
          window.localStorage.removeItem("token");
          setToken(null);
        }
      } catch (error) {
        console.error(error);
      }
    }

    graphql.on("fetch", onFetch);
    return () => graphql.off("fetch", onFetch);
  }, [token, graphql]);

  // Set fetch options
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

  return {
    token,
    fetchOptionsOverride,
    clearToken: useCallback(() => {
      window.localStorage.removeItem("token");
      setToken(null);
    }, [setToken]),
    setToken: useCallback(
      token => {
        window.localStorage.setItem("token", `${token.id}:${token.secret}`);
        setToken(token);
      },
      [setToken]
    )
  };
}
