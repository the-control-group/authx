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
import { filter } from "../../util/filter";

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
  async resolve(source, args, context): Promise<Role[]> {
    const { tx, token: t, realm } = context;
    if (!t) return [];

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

    const roles = await Role.read(tx, ids.rows.map(({ id }) => id));
    return filter(roles, role => role.isAccessibleBy(realm, t, tx));
  }
};
