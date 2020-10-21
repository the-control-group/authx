import { Strategy } from "@authx/authx";
import { SamlAuthority } from "./model/SamlAuthority";
import { SamlCredential } from "./model/SamlCredential";
import { authenticateSaml, GraphQLSamlAuthority } from "./graphql";
import { samlRouterFactory } from "./samlRouter";
import { GraphQLSamlCredential } from "./graphql/GraphQLSamlCredential";

import { createSamlAuthorities } from "./graphql/mutation/createSamlAuthorities";

import { createSamlCredentials } from "./graphql/mutation/createSamlCredentials";
import { GraphQLCreateSamlAuthorityInput } from "./graphql/mutation/GraphQLCreateSamlAuthorityInput";
import { GraphQLCreateSamlCredentialInput } from "./graphql/mutation/GraphQLCreateSamlCredentialInput";
import { GraphQLUpdateSamlAuthorityInput } from "./graphql/mutation/GraphQLUpdateSamlAuthorityInput";
import { GraphQLUpdateSamlCredentialInput } from "./graphql/mutation/GraphQLUpdateSamlCredentialInput";
import { updateSamlAuthorities } from "./graphql/mutation/updateSamlAuthorities";
import { updateSamlCredentials } from "./graphql/mutation/updateSamlCredentials";

const strategy: Strategy = {
  name: "saml",
  types: [
    GraphQLSamlAuthority,
    GraphQLSamlCredential,
    GraphQLCreateSamlAuthorityInput,
    GraphQLCreateSamlCredentialInput,
    GraphQLUpdateSamlAuthorityInput,
    GraphQLUpdateSamlCredentialInput,
  ],
  queryFields: {},
  mutationFields: {
    authenticateSaml,
    createSamlAuthorities,
    createSamlCredentials,
    updateSamlAuthorities,
    updateSamlCredentials,
  },
  authorityModel: SamlAuthority,
  credentialModel: SamlCredential,
  router: samlRouterFactory,
};

export default strategy;
