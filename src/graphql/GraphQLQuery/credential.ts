import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLCredential } from "../GraphQLCredential";
import { Credential } from "../../models";

import { isSuperset, isStrictSuperset } from "scopeutils";

export const credential: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLCredential,
  description: "Fetch a credential by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm, credentialMap } = context;

    // can view the credentials of all users
    if (t && (await t.can(tx, `${realm}:credential.*.*:read.basic`))) {
      return Credential.read(tx, args.id, credentialMap);
    }

    // can view the credentials of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:credential.equal.*:read.basic`))) {
      const [credential, user] = await Promise.all([
        Credential.read(tx, args.id, credentialMap),
        await t.user(tx)
      ]);

      // self credentials are always equal
      if (credential.userId === user.id) {
        return credential;
      }

      // superset or equal
      if (
        isSuperset(
          await user.access(tx),
          await (await credential.user(tx)).access(tx)
        )
      ) {
        return credential;
      }

      return null;
    }

    // can view the credentials of users with lesser access
    if (t && (await t.can(tx, `${realm}:credential.equal.lesser:read.basic`))) {
      const [credential, user] = await Promise.all([
        Credential.read(tx, args.id, credentialMap),
        await t.user(tx)
      ]);

      // check if it's possible to access self credentials
      if (
        credential.userId === user.id &&
        (await t.can(tx, `${realm}:credential.equal.self:read.basic`))
      ) {
        return credential;
      }

      // strict superset
      if (
        isStrictSuperset(
          await user.access(tx),
          await (await credential.user(tx)).access(tx)
        )
      ) {
        return credential;
      }

      return null;
    }

    // can view own credentials
    if (t && (await t.can(tx, `${realm}:credential.equal.self:read.basic`))) {
      const [credential, user] = await Promise.all([
        Credential.read(tx, args.id, credentialMap),
        t.user(tx)
      ]);

      if (credential.userId === user.id) {
        return credential;
      }
    }

    return null;
  }
};
