import { useState, useMemo, useEffect, useCallback } from "react";

interface Token {
  id: string;
  secret: string;
}

// Get the current token from localStorage.
export function useToken(): {
  token: null | { id: string; secret: string };
  clearToken: () => void;
  setToken: (token: { id: string; secret: string }) => void;
} {
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

  return {
    token,
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
