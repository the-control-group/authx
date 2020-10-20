import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";
import { GraphQLSamlCredential } from "../GraphQLSamlCredential";
import { GraphQLAdministrationInput } from "@authx/authx";

export const GraphQLCreateSamlCredentialInput = new GraphQLInputObjectType({
  name: "CreateSamlCredentialInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new credential.",
    },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
      description: GraphQLSamlCredential.getFields().user.description,
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID),
      description: GraphQLSamlCredential.getFields().authority.description,
    },
    nameId: {
      type: GraphQLString,
      description: GraphQLSamlCredential.getFields().nameId.description,
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created credential.",
      defaultValue: [],
    },
  }),
});
