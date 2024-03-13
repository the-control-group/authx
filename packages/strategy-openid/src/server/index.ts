import { Strategy } from "@authx/authx";
import { OpenIdAuthority, OpenIdCredential } from "./model/index.js";
import {
  authenticateOpenId,
  createOpenIdAuthorities,
  updateOpenIdAuthorities,
  createOpenIdCredentials,
  updateOpenIdCredentials,
  GraphQLOpenIdAuthority,
  GraphQLOpenIdCredential,
  GraphQLCreateOpenIdAuthorityInput,
  GraphQLCreateOpenIdCredentialInput,
  GraphQLUpdateOpenIdAuthorityInput,
  GraphQLUpdateOpenIdCredentialInput,
} from "./graphql/index.js";

export * from "./model/index.js";
export * from "./graphql/index.js";

const strategy: Strategy = {
  name: "openid",
  types: [
    GraphQLOpenIdAuthority,
    GraphQLOpenIdCredential,
    GraphQLCreateOpenIdAuthorityInput,
    GraphQLCreateOpenIdCredentialInput,
    GraphQLUpdateOpenIdAuthorityInput,
    GraphQLUpdateOpenIdCredentialInput,
  ],
  queryFields: {},
  mutationFields: {
    authenticateOpenId,

    createOpenIdAuthorities,
    updateOpenIdAuthorities,

    createOpenIdCredentials,
    updateOpenIdCredentials,
  },
  authorityModel: OpenIdAuthority,
  credentialModel: OpenIdCredential,
};

export default strategy;
