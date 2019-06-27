import { Strategy } from "@authx/authx";
import { EmailAuthority, EmailCredential } from "./model";
import {
  authenticateEmail,
  createEmailAuthorities,
  updateEmailAuthorities,
  createEmailCredentials,
  updateEmailCredentials,
  GraphQLEmailAuthority,
  GraphQLEmailCredential
} from "./graphql";

export * from "./model";
export * from "./graphql";

const strategy: Strategy = {
  name: "email",
  types: [GraphQLEmailAuthority, GraphQLEmailCredential],
  queryFields: {},
  mutationFields: {
    authenticateEmail,

    createEmailAuthorities,
    updateEmailAuthorities,

    createEmailCredentials,
    updateEmailCredentials
  },
  authorityModel: EmailAuthority,
  credentialModel: EmailCredential
};

export default strategy;
