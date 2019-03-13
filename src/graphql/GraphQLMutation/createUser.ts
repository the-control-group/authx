import v4 from "uuid/v4";
import {
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull
} from "graphql";
import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLProfileInput } from "../GraphQLProfileInput";
import { GraphQLUserType } from "../GraphQLUserType";
import { User, UserType, ProfileInput } from "../../models";

export const GraphQLCreateUserResult = new GraphQLObjectType({
  name: "CreateUserResult",
  fields: () => ({
    error: { type: GraphQLString },
    user: { type: GraphQLUser }
  })
});

export const user: GraphQLFieldConfig<
  any,
  {
    type: UserType;
    profile: ProfileInput;
  },
  Context
> = {
  type: GraphQLUser,
  description: "Create a new user.",
  args: {
    type: {
      type: new GraphQLNonNull(GraphQLUserType)
    },
    profile: {
      type: new GraphQLNonNull(GraphQLProfileInput)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    const id = v4();
    return User.write(
      tx,
      {
        id,
        type: args.type,
        profile: {
          ...args.profile,
          id
        }
      },
      {
        recordId: v4()
      }
    );

    return null;
  }
};
