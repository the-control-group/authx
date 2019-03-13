import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../models";

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
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    // can view all clients
    if (t && (await t.can(tx, `${realm}:client.*:read.basic`))) {
      return Client.read(tx, args.id);
    }

    // can only view assigned
    if (t && (await t.can(tx, `${realm}:client.assigned:read.basic`))) {
      // TODO:
      throw new Error("UNIMPLEMENTED");
    }

    return null;
  }
};
