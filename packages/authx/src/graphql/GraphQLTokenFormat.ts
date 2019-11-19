import { GraphQLEnumType } from "graphql";

export const GraphQLTokenFormat = new GraphQLEnumType({
  name: "TokenFormat",
  values: {
    BEARER: {
      value: "bearer"
    },
    BASIC: {
      value: "basic"
    }
  }
});
