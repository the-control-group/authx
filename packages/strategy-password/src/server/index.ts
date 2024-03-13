import { Strategy } from "@authx/authx";
import { PasswordAuthority, PasswordCredential } from "./model/index.js";
import {
  authenticatePassword,
  createPasswordAuthorities,
  updatePasswordAuthorities,
  createPasswordCredentials,
  updatePasswordCredentials,
  GraphQLPasswordAuthority,
  GraphQLPasswordCredential,
  GraphQLCreatePasswordAuthorityInput,
  GraphQLCreatePasswordCredentialInput,
  GraphQLUpdatePasswordAuthorityInput,
  GraphQLUpdatePasswordCredentialInput,
} from "./graphql/index.js";

export * from "./model/index.js";
export * from "./graphql/index.js";

const strategy: Strategy = {
  name: "password",
  types: [
    GraphQLPasswordAuthority,
    GraphQLPasswordCredential,
    GraphQLCreatePasswordAuthorityInput,
    GraphQLCreatePasswordCredentialInput,
    GraphQLUpdatePasswordAuthorityInput,
    GraphQLUpdatePasswordCredentialInput,
  ],
  queryFields: {},
  mutationFields: {
    authenticatePassword,

    createPasswordAuthorities,
    updatePasswordAuthorities,

    createPasswordCredentials,
    updatePasswordCredentials,
  },
  authorityModel: PasswordAuthority,
  credentialModel: PasswordCredential,
};

export default strategy;
