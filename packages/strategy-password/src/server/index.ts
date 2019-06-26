import { Strategy } from "@authx/authx";
import { PasswordAuthority, PasswordCredential } from "./model";
import {
  authenticatePassword,
  createPasswordAuthorities,
  updatePasswordAuthorities,
  createPasswordCredentials,
  updatePasswordCredentials,
  GraphQLPasswordAuthority,
  GraphQLPasswordCredential
} from "./graphql";

export * from "./model";
export * from "./graphql";

const strategy: Strategy = {
  name: "password",
  types: [GraphQLPasswordAuthority, GraphQLPasswordCredential],
  queryFields: {},
  mutationFields: {
    authenticatePassword,

    createPasswordAuthorities,
    updatePasswordAuthorities,

    createPasswordCredentials,
    updatePasswordCredentials
  },
  authorityModel: PasswordAuthority,
  credentialModel: PasswordCredential
};

export default strategy;
