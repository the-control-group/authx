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
    const { tx, token, realm, credentialMap } = context;

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

    // can view the credentials of users with greater access
    if (token && (await token.can(tx, `${realm}:credential.greater:read`))) {
      return fetch();
    }

    // can view the credentials of users with equal access
    if (token && (await token.can(tx, `${realm}:credential.equal:read`))) {
      const [credentials, user] = await Promise.all([
        fetch(),
        (await token.grant(tx)).user(tx)
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
    if (token && (await token.can(tx, `${realm}:credential.lesser:read`))) {
      const [credentials, user] = await Promise.all([
        fetch(),
        (await token.grant(tx)).user(tx)
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
            row.credential.userId === user.id ||
            isStrictSuperset(access, row.access)
        )
        .map(({ credential }) => credential);
    }

    // can view own credentials
    if (token && (await token.can(tx, `${realm}:credential.self:read`))) {
      const grant = await token.grant(tx);

      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.credential_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
          AND user_id = $1
        `,
        [grant.userId]
      );

      if (!ids.rows.length) {
        return [];
      }

      return Credential.read(tx, ids.rows.map(({ id }) => id), credentialMap);
    }

    return [];
  }
};
