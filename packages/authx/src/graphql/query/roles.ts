import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { GraphQLRoleConnection } from "../GraphQLRoleConnection";
import { Context } from "../../Context";
import { Role } from "../../model";
import { filter } from "../../util/filter";

export const roles: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLRoleConnection,
  description: "List all roles.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled roles in results."
    }
  },
  async resolve(source, args, context) {
    const { executor, authorization: a, realm } = context;
    if (!a) return [];

    const ids = await executor.tx.query(
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

    const roles = await Role.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return connectionFromArray(
      await filter(roles, role => role.isAccessibleBy(realm, a, executor)),
      args
    );
  }
};
