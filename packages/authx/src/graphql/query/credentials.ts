import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLCredential } from "../GraphQLCredential";
import { Context } from "../../Context";
import { Credential } from "../../model";
import { filter } from "../../util/filter";

export const credentials: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLCredential)),
  description: "List all credentials.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled credentials in results."
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
  async resolve(source, args, context): Promise<Credential<any>[]> {
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
    return filter(credentials, credential =>
      credential.isAccessibleBy(realm, a, tx)
    );
  }
};
