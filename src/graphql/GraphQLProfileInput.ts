import { GraphQLString, GraphQLInputObjectType } from "graphql";

export const GraphQLProfileNameInput = new GraphQLInputObjectType({
  name: "ProfileNameInput",
  fields: () => ({
    formatted: { type: GraphQLString },
    familyName: { type: GraphQLString },
    givenName: { type: GraphQLString },
    middleName: { type: GraphQLString },
    honorificPrefix: { type: GraphQLString },
    honorificSuffix: { type: GraphQLString }
  })
});

export const GraphQLProfileInput = new GraphQLInputObjectType({
  name: "ProfileInput",
  fields: () => ({
    displayName: { type: GraphQLString },
    nickname: { type: GraphQLString },
    updated: { type: GraphQLString },
    birthday: { type: GraphQLString },
    anniversary: { type: GraphQLString },
    gender: { type: GraphQLString },
    note: { type: GraphQLString },
    preferredUsername: { type: GraphQLString },
    utcOffset: { type: GraphQLString },
    name: { type: GraphQLProfileNameInput }
  })
});
