import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLList,
} from "graphql";
import { GraphQLScope } from "./GraphQLScope.js";

export const GraphQLAdministrationInput = new GraphQLInputObjectType({
  name: "AdministrationInput",
  fields: () => ({
    roleId: {
      type: new GraphQLNonNull(GraphQLID),
      description:
        "The UUID of a role to which administration scopes will be added.",
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLScope)),
      description:
        "An optional list of scopes used to restrict those added to the specified role.",
      defaultValue: ["**:**:**"],
    },
  }),
});
