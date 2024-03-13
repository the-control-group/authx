import { Strategy } from "@authx/authx";
import { EmailAuthority, EmailCredential } from "./model/index.js";
import {
  authenticateEmail,
  createEmailAuthorities,
  updateEmailAuthorities,
  createEmailCredentials,
  updateEmailCredentials,
  GraphQLEmailAuthority,
  GraphQLEmailCredential,
  GraphQLCreateEmailAuthorityInput,
  GraphQLCreateEmailCredentialInput,
  GraphQLUpdateEmailAuthorityInput,
  GraphQLUpdateEmailCredentialInput,
} from "./graphql/index.js";

export * from "./model/index.js";
export * from "./graphql/index.js";

const strategy: Strategy = {
  name: "email",
  types: [
    GraphQLEmailAuthority,
    GraphQLEmailCredential,
    GraphQLCreateEmailAuthorityInput,
    GraphQLCreateEmailCredentialInput,
    GraphQLUpdateEmailAuthorityInput,
    GraphQLUpdateEmailCredentialInput,
  ],
  queryFields: {},
  mutationFields: {
    authenticateEmail,

    createEmailAuthorities,
    updateEmailAuthorities,

    createEmailCredentials,
    updateEmailCredentials,
  },
  authorityModel: EmailAuthority,
  credentialModel: EmailCredential,
};

export default strategy;
