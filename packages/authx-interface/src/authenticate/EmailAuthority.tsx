import React, { useState, useRef, useEffect, ComponentType } from "react";
import { GraphQL, GraphQLContext, useGraphQL } from "graphql-react";
import { StrategyComponentProps } from "./definitions";

export function EmailAuthority({ authority }: StrategyComponentProps) {
  // Focus the email field on mount
  const focusElement = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  if (!mounted) setMounted(true);
  const [focused, setFocused] = useState<boolean>(false);
  useEffect(() => {
    const { current } = focusElement;
    if (!focused && current) {
      current.focus();
      setFocused(true);
    }
  });

  // Email
  const [password, setPassword] = useState<string>("");

  return (
    <form>
      <label>
        <span>Email</span>
        <input ref={focusElement} type="email" required />
      </label>
      <p>
        Send a unique URL to your email address, which can be used for up to 15
        minutes to authenticate yourself.
      </p>

      <label>
        <input type="submit" value="Submit" />
      </label>
    </form>
  );
}
