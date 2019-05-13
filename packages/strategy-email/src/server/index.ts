import { Strategy } from "@authx/authx";
import { EmailAuthority, EmailCredential } from "./model";
import {
  authenticateEmail,
  createEmailAuthority,
  updateEmailAuthority,
  createEmailCredential,
  updateEmailCredential,
  GraphQLEmailAuthority,
  GraphQLEmailCredential
} from "./graphql";

export * from "./model";

const strategy: Strategy = {
  name: "email",
  types: [GraphQLEmailAuthority, GraphQLEmailCredential],
  queryFields: {},
  mutationFields: {
    authenticateEmail,

    createEmailAuthority,
    updateEmailAuthority,

    createEmailCredential,
    updateEmailCredential
  },
  authorityModel: EmailAuthority,
  credentialModel: EmailCredential
};

export default strategy;
