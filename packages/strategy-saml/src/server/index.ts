import { Strategy } from "@authx/authx";
import { SamlAuthority } from "./model/SamlAuthority.js";
import { SamlCredential } from "./model/SamlCredential.js";
import { authenticateSaml, GraphQLSamlAuthority } from "./graphql/index.js";
import { samlRouterFactory } from "./samlRouter.js";
import { GraphQLSamlCredential } from "./graphql/GraphQLSamlCredential.js";

import { createSamlAuthorities } from "./graphql/mutation/createSamlAuthorities.js";

import { createSamlCredentials } from "./graphql/mutation/createSamlCredentials.js";
import { GraphQLCreateSamlAuthorityInput } from "./graphql/mutation/GraphQLCreateSamlAuthorityInput.js";
import { GraphQLCreateSamlCredentialInput } from "./graphql/mutation/GraphQLCreateSamlCredentialInput.js";
import { GraphQLUpdateSamlAuthorityInput } from "./graphql/mutation/GraphQLUpdateSamlAuthorityInput.js";
import { GraphQLUpdateSamlCredentialInput } from "./graphql/mutation/GraphQLUpdateSamlCredentialInput.js";
import { updateSamlAuthorities } from "./graphql/mutation/updateSamlAuthorities.js";
import { updateSamlCredentials } from "./graphql/mutation/updateSamlCredentials.js";

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
