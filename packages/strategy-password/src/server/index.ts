import { Strategy } from "@authx/authx";
import { PasswordAuthority, PasswordCredential } from "./model";
import {
  authenticatePassword,
  createPasswordAuthority,
  updatePasswordAuthority,
  createPasswordCredential,
  updatePasswordCredential,
  GraphQLPasswordAuthority,
  GraphQLPasswordCredential
} from "./graphql";

export * from "./model";

const strategy: Strategy = {
  name: "password",
  types: [GraphQLPasswordAuthority, GraphQLPasswordCredential],
  queryFields: {},
  mutationFields: {
    authenticatePassword,

    createPasswordAuthority,
    updatePasswordAuthority,

    createPasswordCredential,
    updatePasswordCredential
  },
  authorityModel: PasswordAuthority,
  credentialModel: PasswordCredential
};

export default strategy;
