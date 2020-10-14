import { createV2AuthXScope, CredentialContext } from "./scopes";

export function createV2CredentialAdministrationScopes(
  realm: string,
  credentialContext: CredentialContext
): string[] {
  return [
    createV2AuthXScope(realm, credentialContext, {
      basic: "r",
      details: "",
    }),
    createV2AuthXScope(realm, credentialContext, {
      basic: "r",
      details: "r",
    }),
    createV2AuthXScope(realm, credentialContext, {
      basic: "r",
      details: "*",
    }),
    createV2AuthXScope(realm, credentialContext, {
      basic: "w",
      details: "",
    }),
    createV2AuthXScope(realm, credentialContext, {
      basic: "w",
      details: "w",
    }),
    createV2AuthXScope(realm, credentialContext, {
      basic: "w",
      details: "*",
    }),
    createV2AuthXScope(realm, credentialContext, {
      basic: "*",
      details: "*",
    }),
  ];
}
