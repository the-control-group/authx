import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { randomBytes } from "crypto";
import { compare } from "bcrypt";
import v4 from "uuid/v4";

import { Context } from "../../graphql/Context";
import { GraphQLToken } from "../../graphql";
import { Authority, Token } from "../../models";
import { ForbiddenError, AuthenticationError } from "../../errors";

import { PasswordAuthority, PasswordCredential } from "./models";

const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticatePassword: GraphQLFieldConfig<
  any,
  {
    identityAuthorityId: string;
    identityAuthorityUserId: string;
    passwordAuthorityId: string;
    password: string;
  },
  Context
> = {
  type: GraphQLToken,
  description: "Create a new token.",
  args: {
    identityAuthorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    identityAuthorityUserId: {
      type: new GraphQLNonNull(GraphQLString)
    },
    passwordAuthorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    password: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(source, args, context): Promise<Token> {
    const { tx, token: t, realm, authorityMap } = context;

    if (t) {
      throw new ForbiddenError("You area already authenticated.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      // fetch the authority
      const authority = await Authority.read(
        tx,
        args.passwordAuthorityId,
        authorityMap
      );

      if (!(authority instanceof PasswordAuthority)) {
        throw new AuthenticationError(
          __DEV__
            ? "The authority uses a strategy other than password."
            : undefined
        );
      }

      // find the user ID given identityAuthorityId and identityAuthorityUserId
      var userId: string | null;
      if (args.identityAuthorityId === authority.id) {
        userId = args.identityAuthorityUserId;
      } else {
        const results = await tx.query(
          `
          SELECT user_id
          FROM authx.credential_record
          WHERE
            authority_id = $1
            AND authority_user_id = $2
            AND enabled = true
            AND replacement_record_id IS NULL
        `,
          [args.identityAuthorityId, args.identityAuthorityUserId]
        );

        if (results.rows.length > 1) {
          throw new Error(
            "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
          );
        }

        userId = results.rows.length ? results.rows[0].user_id : null;
        if (!userId) {
          throw new AuthenticationError(
            __DEV__ ? "Unable to find user identity." : undefined
          );
        }
      }

      // get the credential
      const credential = await authority.credential(tx, userId);

      if (!credential) {
        throw new AuthenticationError(
          __DEV__ ? "No such credential exists." : undefined
        );
      }

      // check the password
      if (!(await compare(args.password, credential.details.hash))) {
        throw new AuthenticationError(
          __DEV__ ? "The password is incorrect." : undefined
        );
      }

      // create a new token
      const tokenId = v4();
      const token = await Token.write(
        tx,
        {
          id: tokenId,
          enabled: true,
          userId,
          grantId: null,
          secret: randomBytes(16).toString("hex"),
          scopes: [`${realm}:**:**`]
        },
        {
          recordId: v4(),
          createdByTokenId: tokenId,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");

      return token;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
