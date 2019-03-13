import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../models";

import { isSuperset, isStrictSuperset } from "scopeutils";

export const grant: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLGrant,
  description: "Fetch a grant by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    // can view the grants of all users
    if (t && (await t.can(tx, `${realm}:grant.*.*:read.basic`))) {
      return Grant.read(tx, args.id);
    }

    // can view the grants of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:grant.equal.*:read.basic`))) {
      const [grant, user] = await Promise.all([
        Grant.read(tx, args.id),
        await t.user(tx)
      ]);

      // assigned grants are always equal
      if (grant.userId === user.id) {
        return grant;
      }

      // superset or equal
      if (
        isSuperset(
          await user.access(tx),
          await (await grant.user(tx)).access(tx)
        )
      ) {
        return grant;
      }

      return null;
    }

    // can view the grants of users with lesser access
    if (t && (await t.can(tx, `${realm}:grant.equal.lesser:read.basic`))) {
      const [grant, user] = await Promise.all([
        Grant.read(tx, args.id),
        await t.user(tx)
      ]);

      // check if it's possible to access assigned grants
      if (
        grant.userId === user.id &&
        (await t.can(tx, `${realm}:grant.equal.assigned:read.basic`))
      ) {
        return grant;
      }

      // strict superset
      if (
        isStrictSuperset(
          await user.access(tx),
          await (await grant.user(tx)).access(tx)
        )
      ) {
        return grant;
      }

      return null;
    }

    // can view own grants
    if (t && (await t.can(tx, `${realm}:grant.equal.assigned:read.basic`))) {
      const [grant, user] = await Promise.all([
        Grant.read(tx, args.id),
        t.user(tx)
      ]);

      if (grant.userId === user.id) {
        return grant;
      }
    }

    return null;
  }
};
