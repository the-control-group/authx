import { Strategy } from "@authx/authx";
import { OpenIdAuthority, OpenIdCredential } from "./model";
import {
  authenticateOpenId,
  createOpenIdAuthority,
  updateOpenIdAuthority,
  createOpenIdCredential,
  updateOpenIdCredential,
  GraphQLOpenIdAuthority,
  GraphQLOpenIdCredential
} from "./graphql";

export * from "./model";

const strategy: Strategy = {
  name: "openid",
  types: [GraphQLOpenIdAuthority, GraphQLOpenIdCredential],
  queryFields: {},
  mutationFields: {
    authenticateOpenId,

    createOpenIdAuthority,
    updateOpenIdAuthority,

    createOpenIdCredential,
    updateOpenIdCredential
  },
  authorityModel: OpenIdAuthority,
  credentialModel: OpenIdCredential
};

export default strategy;
