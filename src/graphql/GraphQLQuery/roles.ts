import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLRole } from "../GraphQLRole";
import { Context } from "../Context";
import { Role } from "../../models";
import { isSuperset, isStrictSuperset } from "scopeutils";

export const roles: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLRole)),
  description: "List all roles.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled roles in results."
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

    async function fetch(): Promise<Role[]> {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.role_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      return Role.read(tx, ids.rows.map(({ id }) => id));
    }

    // can view the all roles
    if (t && (await t.can(tx, `${realm}:role.*.*:read.basic`))) {
      return fetch();
    }

    // can view roles of lesser or equal access
    if (t && (await t.can(tx, `${realm}:role.equal.*:read.basic`))) {
      const [roles, user] = await Promise.all([fetch(), await t.user(tx)]);

      const access = await user.access(tx);

      return (await Promise.all(
        roles.map(async role => {
          return {
            role,
            access: await (await role.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row => row.role.userIds.has(user.id) || isSuperset(access, row.access)
        )
        .map(({ role }) => role);
    }

    // can view roles of lesser access
    if (t && (await t.can(tx, `${realm}:role.equal.lesser:read.basic`))) {
      const [roles, user] = await Promise.all([fetch(), await t.user(tx)]);

      const access = await user.access(tx);
      const canAccessAssigned = await t.can(
        tx,
        `${realm}:role.equal.assigned:read.basic`
      );

      return (await Promise.all(
        roles.map(async role => {
          return {
            role,
            access: role.access()
          };
        })
      ))
        .filter(
          row =>
            (row.role.userIds.has(user.id) && canAccessAssigned) ||
            isStrictSuperset(access, row.access)
        )
        .map(({ role }) => role);
    }

    // can view assigned roles
    if (t && (await t.can(tx, `${realm}:role.equal.assigned:read.basic`))) {
      const user = await t.user(tx);

      const ids = await tx.query(
        `
        SELECT authx.role_record.entity_id AS id
        FROM authx.role_record
        JOIN authx.role_record_user
          ON authx.role_record_user.record_id = authx.role_record.record_id
        WHERE
          authx.role_record.replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND authx.role_record.enabled = true"}
          AND authx.role_record_user.user_id = $1
        `,
        [user.id]
      );

      if (!ids.rows.length) {
        return [];
      }

      return Role.read(tx, ids.rows.map(({ id }) => id));
    }

    return [];
  }
};
