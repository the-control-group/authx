import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";
import { GraphQLSamlAuthority } from "../GraphQLSamlAuthority";
import { GraphQLAdministrationInput } from "@authx/authx";

export const GraphQLCreateSamlAuthorityInput = new GraphQLInputObjectType({
  name: "CreateSamlAuthorityInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new authority.",
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created authority.",
      defaultValue: [],
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: GraphQLSamlAuthority.getFields().name.description,
    },
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: GraphQLSamlAuthority.getFields().description.description,
    },
    authUrl: {
      type: new GraphQLNonNull(GraphQLString),
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
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLID))
      ) as any,
      description: "When a user is created, assign to these role IDs.",
      defaultValue: [],
    },
    entityId: {
      type: new GraphQLNonNull(GraphQLString),
      description: GraphQLSamlAuthority.getFields().entityId.description,
    },
    serviceProviderPrivateKey: {
      type: new GraphQLNonNull(GraphQLString),
      description: GraphQLSamlAuthority.getFields().serviceProviderPrivateKey
        .description,
    },
    serviceProviderCertificate: {
      type: new GraphQLNonNull(GraphQLString),
      description: GraphQLSamlAuthority.getFields().serviceProviderCertificate
        .description,
    },
    identityProviderCertificates: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      ),
      description: GraphQLSamlAuthority.getFields().identityProviderCertificates
        .description,
    },
  }),
});
