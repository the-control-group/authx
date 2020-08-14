import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";

export const client: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLClient,
  description: "Fetch a client by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Client> {
    const { executor, authorization: a, realm } = context;
    if (!a) return null;

    const client = await Client.read(executor, args.id);
    return (await client.isAccessibleBy(realm, a, executor)) ? client : null;
  }
};
