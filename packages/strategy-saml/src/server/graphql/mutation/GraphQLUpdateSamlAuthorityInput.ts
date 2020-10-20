import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";
import { GraphQLSamlAuthority } from "../GraphQLSamlAuthority";

export const GraphQLUpdateSamlAuthorityInput = new GraphQLInputObjectType({
  name: "UpdateSamlAuthorityInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
    name: {
      type: GraphQLString,
      description: GraphQLSamlAuthority.getFields().name.description,
    },
    description: {
      type: GraphQLString,
      description: GraphQLSamlAuthority.getFields().description.description,
    },
    authUrl: {
      type: GraphQLString,
      description: GraphQLSamlAuthority.getFields().matchesUsersByEmail
        .description,
    },
    emailAuthorityId: {
      type: GraphQLID,
      description: GraphQLSamlAuthority.getFields().emailAuthorityId
        .description,
    },
    matchesUsersByEmail: {
      type: GraphQLBoolean,
      description: GraphQLSamlAuthority.getFields().matchesUsersByEmail
        .description,
      defaultValue: false,
    },
    createsUnmatchedUsers: {
      type: GraphQLBoolean,
      description: GraphQLSamlAuthority.getFields().createsUnmatchedUsers
        .description,
      defaultValue: false,
    },
    assignsCreatedUsersToRoleIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
      description: "When a user is created, assign to these role IDs.",
      defaultValue: [],
    },
    entityId: {
      type: GraphQLString,
      description: GraphQLSamlAuthority.getFields().entityId.description,
    },
    serviceProviderPrivateKey: {
      type: GraphQLString,
      description: GraphQLSamlAuthority.getFields().serviceProviderPrivateKey
        .description,
    },
    serviceProviderCertificate: {
      type: GraphQLString,
      description: GraphQLSamlAuthority.getFields().serviceProviderCertificate
        .description,
    },
    identityProviderCertificates: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description: GraphQLSamlAuthority.getFields().identityProviderCertificates
        .description,
    },
  }),
});
