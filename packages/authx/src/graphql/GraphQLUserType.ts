import { GraphQLEnumType } from "graphql";

export const GraphQLUserType = new GraphQLEnumType({
  name: "UserType",
  values: {
    HUMAN: {
      value: "HUMAN"
    },
    BOT: {
      value: "BOT"
    }
  }
});
