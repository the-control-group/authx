import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLCredential } from "../GraphQLCredential";
import { Context } from "../Context";
import { Credential } from "../../models";
import { isSuperset, isStrictSuperset } from "scopeutils";

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
  async resolve(source, args, context) {
    const { tx, token: t, realm, credentialMap } = context;

    async function fetch(): Promise<Credential<any>[]> {
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

      return Credential.read(tx, ids.rows.map(({ id }) => id), credentialMap);
    }

    // can view the credentials of all users
    if (t && (await t.can(tx, `${realm}:credential.*.*:read.basic`))) {
      return fetch();
    }

    // can view the credentials of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:credential.equal.*:read.basic`))) {
      const [credentials, user] = await Promise.all([
        fetch(),
        await t.user(tx)
      ]);

      const access = await user.access(tx);

      return (await Promise.all(
        credentials.map(async credential => {
          return {
            credential,
            access: await (await credential.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row =>
            row.credential.userId === user.id || isSuperset(access, row.access)
        )
        .map(({ credential }) => credential);
    }

    // can view the credentials of users with lesser access
    if (t && (await t.can(tx, `${realm}:credential.equal.lesser:read.basic`))) {
      const [credentials, user] = await Promise.all([
        fetch(),
        await t.user(tx)
      ]);

      const access = await user.access(tx);
      const canAccessSelf = await t.can(
        tx,
        `${realm}:credential.equal.self:read.basic`
      );

      return (await Promise.all(
        credentials.map(async credential => {
          return {
            credential,
            access: await (await credential.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row =>
            (row.credential.userId === user.id && canAccessSelf) ||
            isStrictSuperset(access, row.access)
        )
        .map(({ credential }) => credential);
    }

    // can view own credentials
    if (t && (await t.can(tx, `${realm}:credential.equal.self:read.basic`))) {
      const user = await t.user(tx);

      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.credential_record
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

      return Credential.read(tx, ids.rows.map(({ id }) => id), credentialMap);
    }

    return [];
  }
};
