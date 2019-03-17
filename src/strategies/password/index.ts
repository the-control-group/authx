import { Strategy } from "../../Strategy";
import { PasswordAuthority, PasswordCredential } from "./models";
import { GraphQLPasswordAuthority, GraphQLPasswordCredential } from "./graphql";
import {
  authenticatePassword,
  GraphQLAuthenticatePasswordResult
} from "./authenticatePassword";

export * from "./models";

const strategy: Strategy = {
  name: "password",
  types: [
    GraphQLPasswordAuthority,
    GraphQLPasswordCredential,
    GraphQLAuthenticatePasswordResult
  ],
  queryFields: {},
  mutationFields: {
    authenticatePassword
  },
  authorityModel: PasswordAuthority,
  credentialModel: PasswordCredential
};

export default strategy;
