import { useState, useMemo, useEffect, useCallback } from "react";

// Get the current authorization from localStorage.
export function useAuthorization(): {
  authorization: null | { id: string; secret: string };
  clearAuthorization: () => void;
  setAuthorization: (authorization: { id: string; secret: string }) => void;
} {
  const [authorization, setAuthorization] = useState<null | {
    id: string;
    secret: string;
  }>(
    useMemo(() => {
      const [authorizationId, authorizationSecret] = (
        window.localStorage.getItem("authx-interface.authorization") || ":"
      ).split(":");

      return authorizationId && authorizationSecret
        ? { id: authorizationId, secret: authorizationSecret }
        : null;
    }, [])
  );

  // Listen for changes to the authorization in localStorage
  useEffect(() => {
    function onChange(e: StorageEvent): void {
      if (e.key === "authx-interface.authorization") {
        const [authorizationId, authorizationSecret] = (
          e.newValue || ":"
        ).split(":");
        if (
          authorizationId &&
          authorizationSecret &&
          (!authorization ||
            authorization.id !== authorizationId ||
            authorization.secret !== authorizationSecret)
        ) {
          setAuthorization({
            id: authorizationId,
            secret: authorizationSecret
          });
        }
      }
    }

    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
    };
  }, [authorization, setAuthorization]);

  return {
    authorization,
    clearAuthorization: useCallback(() => {
      window.localStorage.removeItem("authx-interface.authorization");
      setAuthorization(null);
    }, [setAuthorization]),
    setAuthorization: useCallback(
      authorization => {
        window.localStorage.setItem(
          "authx-interface.authorization",
          `${authorization.id}:${authorization.secret}`
        );
        setAuthorization(authorization);
      },
      [setAuthorization]
    )
  };
}
