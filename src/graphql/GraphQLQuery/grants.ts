import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLGrant } from "../GraphQLGrant";
import { Context } from "../Context";
import { Grant } from "../../models";
import { isSuperset, isStrictSuperset } from "scopeutils";

export const grants: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLGrant)),
  description: "List all grants.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled grants in results."
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
    const { tx, token: t, realm } = context;

    async function fetch(): Promise<Grant[]> {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.grant_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      return Grant.read(tx, ids.rows.map(({ id }) => id));
    }

    // can view the grants of all users
    if (t && (await t.can(tx, `${realm}:grant.*.*:read.basic`))) {
      return fetch();
    }

    // can view the grants of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:grant.equal.*:read.basic`))) {
      const [grants, user] = await Promise.all([fetch(), await t.user(tx)]);

      const access = await user.access(tx);

      return (await Promise.all(
        grants.map(async grant => {
          return {
            grant,
            access: await (await grant.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row => row.grant.userId === user.id || isSuperset(access, row.access)
        )
        .map(({ grant }) => grant);
    }

    // can view the grants of users with lesser access
    if (t && (await t.can(tx, `${realm}:grant.equal.lesser:read.basic`))) {
      const [grants, user] = await Promise.all([fetch(), await t.user(tx)]);

      const access = await user.access(tx);
      const canAccessSelf = await t.can(
        tx,
        `${realm}:grant.equal.self:read.basic`
      );

      return (await Promise.all(
        grants.map(async grant => {
          return {
            grant,
            access: await (await grant.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row =>
            (row.grant.userId === user.id && canAccessSelf) ||
            isStrictSuperset(access, row.access)
        )
        .map(({ grant }) => grant);
    }

    // can view own grants
    if (t && (await t.can(tx, `${realm}:grant.equal.self:read.basic`))) {
      const user = await t.user(tx);

      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.grant_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
          AND user_id = $1
        `,
        [user.id]
      );

      if (!ids.rows.length) {
        return [];
      }

      return Grant.read(tx, ids.rows.map(({ id }) => id));
    }

    return [];
  }
};
