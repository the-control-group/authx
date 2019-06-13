import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { GraphQLCredential } from "../GraphQLCredential";
import { Context } from "../../Context";
import { Credential } from "../../model";
import { filter } from "../../util/filter";

export const credentials: GraphQLFieldConfig<
  any,
  ConnectionArguments & {
    includeDisabled: boolean;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLCredential)),
  description: "List all credentials.",
  ...connectionArgs,
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled credentials in results."
    }
  },
  async resolve(source, args, context) {
    const {
      tx,
      authorization: a,
      realm,
      strategies: { credentialMap }
    } = context;
    if (!a) return [];

    const ids = await tx.query(
      `
        SELECT entity_id AS id
        FROM authx.credential_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
    );

    if (!ids.rows.length) {
      return [];
    }

    const credentials = await Credential.read(
      tx,
      ids.rows.map(({ id }) => id),
      credentialMap
    );

    return connectionFromArray(
      await filter(credentials, credential =>
        credential.isAccessibleBy(realm, a, tx)
      ),
      args
    );
  }
};
