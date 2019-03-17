import { Strategy } from "../../Strategy";
import { PasswordAuthority, PasswordCredential } from "./models";
import { GraphQLPasswordAuthority, GraphQLPasswordCredential } from "./graphql";
import { authenticatePassword } from "./authenticatePassword";

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
