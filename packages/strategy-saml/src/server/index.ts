import { Strategy } from "@authx/authx";
import { SamlAuthority, SamlCredential } from "./model";
import {
  authenticateSaml,
  createSamlAuthorities,
  updateSamlAuthorities,
  createSamlCredentials,
  updateSamlCredentials,
  GraphQLSamlAuthority,
  GraphQLSamlCredential,
  GraphQLCreateSamlAuthorityInput,
  GraphQLCreateSamlCredentialInput,
  GraphQLUpdateSamlAuthorityInput,
  GraphQLUpdateSamlCredentialInput
} from "./graphql";

export * from "./model";
export * from "./graphql";

const strategy: Strategy = {
  name: "openid",
  types: [
    GraphQLSamlAuthority,
    GraphQLSamlCredential,
    GraphQLCreateSamlAuthorityInput,
    GraphQLCreateSamlCredentialInput,
    GraphQLUpdateSamlAuthorityInput,
    GraphQLUpdateSamlCredentialInput
  ],
  queryFields: {},
  mutationFields: {
    authenticateSaml,

    createSamlAuthorities,
    updateSamlAuthorities,

    createSamlCredentials,
    updateSamlCredentials
  },
  authorityModel: SamlAuthority,
  credentialModel: SamlCredential
};

export default strategy;
