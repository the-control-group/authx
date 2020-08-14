import { createV2AuthXScope, AuthorityContext } from "./scopes";

export function createV2AuthorityAdministrationScopes(
  realm: string,
  authorityContext: AuthorityContext
): string[] {
  return [
    createV2AuthXScope(realm, authorityContext, {
      basic: "r",
      details: ""
    }),
    createV2AuthXScope(realm, authorityContext, {
      basic: "r",
      details: "r"
    }),
    createV2AuthXScope(realm, authorityContext, {
      basic: "r",
      details: "*"
    }),
    createV2AuthXScope(realm, authorityContext, {
      basic: "w",
      details: ""
    }),
    createV2AuthXScope(realm, authorityContext, {
      basic: "w",
      details: "w"
    }),
    createV2AuthXScope(realm, authorityContext, {
      basic: "w",
      details: "*"
    }),
    createV2AuthXScope(realm, authorityContext, {
      basic: "*",
      details: "*"
    })
  ];
}
