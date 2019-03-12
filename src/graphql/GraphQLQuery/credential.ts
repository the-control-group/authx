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
    const { tx, token, realm, credentialMap } = context;

    // can view the credentials of users with greater access
    if (token && (await token.can(tx, `${realm}:credential.greater:read`))) {
      return Credential.read(tx, args.id, credentialMap);
    }

    // can view the credentials of users with equal access
    if (token && (await token.can(tx, `${realm}:credential.equal:read`))) {
      const [credential, user] = await Promise.all([
        Credential.read(tx, args.id, credentialMap),
        (await token.grant(tx)).user(tx)
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
    if (token && (await token.can(tx, `${realm}:credential.lesser:read`))) {
      const [credential, user] = await Promise.all([
        Credential.read(tx, args.id, credentialMap),
        (await token.grant(tx)).user(tx)
      ]);

      // check if it's possible to access self credentials
      if (
        credential.userId === user.id &&
        (await token.can(tx, `${realm}:credential.self:read`))
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
    if (token && (await token.can(tx, `${realm}:credential.self:read`))) {
      const [credential, grant] = await Promise.all([
        Credential.read(tx, args.id, credentialMap),
        token.grant(tx)
      ]);

      if (credential.userId === grant.userId) {
        return credential;
      }
    }

    return null;
  }
};
