import { Strategy } from "../../Strategy";
import { PasswordAuthority, PasswordCredential } from "./models";
import {
  authenticatePassword,
  GraphQLPasswordAuthority,
  GraphQLPasswordCredential
} from "./graphql";

export * from "./models";

const strategy: Strategy = {
  name: "password",
  types: [GraphQLPasswordAuthority, GraphQLPasswordCredential],
  queryFields: {},
  mutationFields: {
    authenticatePassword
  },
  authorityModel: PasswordAuthority,
  credentialModel: PasswordCredential
};

export default strategy;
