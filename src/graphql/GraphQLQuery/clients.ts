import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLClient } from "../GraphQLClient";
import { Context } from "../Context";
import { Client } from "../../models";

export const clients: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLClient)),
  description: "List all clients.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled clients in results."
    },
    offset: {
      type: GraphQLInt,
      description: "The number of results to skip."
    },
    limit: {
      type: GraphQLInt,
      description: "The maximum number of results to return."
    }
  },
  async resolve(source, args, context) {
    const { tx, token, realm } = context;

    // can view all clients
    if (token && (await token.can(tx, `${realm}:client.*:read`))) {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.client_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      return Client.read(tx, ids.rows.map(({ id }) => id));
    }

    // can only view assigned clients
    if (token && (await token.can(tx, `${realm}:client.assigned:read`))) {
      // TODO:
      throw new Error("UNIMPLEMENTED");
    }

    return [];
  }
};
