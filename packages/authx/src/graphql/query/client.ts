import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";

export const client: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLClient,
  description: "Fetch a client by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Client> {
    const { tx, token: t, realm } = context;
    if (!t) return null;

    const client = await Client.read(tx, args.id);
    return (await client.isAccessibleBy(realm, t, tx)) ? client : null;
  }
};
