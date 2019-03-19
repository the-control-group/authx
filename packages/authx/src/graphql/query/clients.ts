import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLClient } from "../GraphQLClient";
import { Context } from "../Context";
import { Client } from "../../model";
import { filter } from "../../util/filter";

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
  async resolve(source, args, context): Promise<Client[]> {
    const { tx, token: t, realm } = context;
    if (!t) return [];

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

    const clients = await Client.read(tx, ids.rows.map(({ id }) => id));
    return filter(clients, client => client.isAccessibleBy(realm, t, tx));
  }
};
