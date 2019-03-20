import React, { useState, useRef, useEffect, ComponentType } from "react";
import { GraphQL, GraphQLContext, useGraphQL } from "graphql-react";
import { StrategyComponentProps } from "./definitions";

export function PasswordAuthority({
  authority,
  authorities
}: StrategyComponentProps) {
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

  // Identity
  const [identityAuthorityId, setIdentityAuthorityId] = useState<string>("");
  const [identityAuthorityUserId, setIdentityAuthorityUserId] = useState<
    string
  >("");
  const identityAuthority =
    (identityAuthorityId &&
      authorities.find(a => a.id === identityAuthorityId)) ||
    null;

  // Default to using an email address
  if (!identityAuthorityId) {
    const firstEmailAuthority = authorities.find(a => a.strategy === "email"));
    if (firstEmailAuthority) {
      setIdentityAuthorityId(firstEmailAuthority.id)
    }
  }

  // Password
  const [password, setPassword] = useState<string>("");

  return (
    <form>
      <label>
        <span>Identity</span>
        <div style={{ display: "flex" }}>
          <select
            value={identityAuthorityId}
            onChange={e => setIdentityAuthorityId(e.target.value)}
            style={{ marginRight: "14px" }}
          >
            <option value={authority.id}>User ID</option>
            {authorities
              .filter(a => a.strategy === "email")
              .map(a => (
                <option value={a.id}>{a.name}</option>
              ))}
          </select>
          <input
            ref={focusElement}
            type={(identityAuthority && identityAuthority.strategy) || "text"}
            value={identityAuthorityUserId}
            onChange={e => setIdentityAuthorityUserId(e.target.value)}
            style={{ flex: "1" }}
            required
          />
        </div>
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </label>
      <label>
        <input type="submit" value="Submit" />
      </label>
    </form>
  );
}
