import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { randomBytes } from "crypto";
import { compare } from "bcrypt";
import { v4 } from "uuid";

import {
  Context,
  GraphQLAuthorization,
  Authority,
  Authorization,
  ForbiddenError,
  AuthenticationError,
  User
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/scopes";

import { isSuperset } from "@authx/scopes";
import { PasswordAuthority } from "../../model";
const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticatePassword: GraphQLFieldConfig<
  any,
  Context,
  {
    identityAuthorityId: string;
    identityAuthorityUserId: string;
    passwordAuthorityId: string;
    password: string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
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
  async resolve(source, args, context): Promise<Authorization> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");

      // Fetch the authority.
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

      // Find the user ID given identityAuthorityId and identityAuthorityUserId.
      let userId: string | null;
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
      }

      if (!userId) {
        throw new AuthenticationError(
          __DEV__ ? "Unable to find user identity." : undefined
        );
      }

      // Get the credential.
      const credential = await authority.credential(tx, userId);

      if (!credential) {
        throw new AuthenticationError(
          __DEV__ ? "No such credential exists." : undefined
        );
      }

      // Check the password.
      if (!(await compare(args.password, credential.details.hash))) {
        throw new AuthenticationError(
          __DEV__ ? "The password is incorrect." : undefined
        );
      }

      // Invoke the credential.
      await credential.invoke(tx, {
        id: v4(),
        createdAt: new Date()
      });

      const authorizationId = v4();

      const values = {
        currentAuthorizationId: authorizationId,
        currentUserId: credential.userId,
        currentGrantId: null,
        currentClientId: null
      };

      // Make sure the user can create new authorizations.
      const user = await User.read(tx, credential.userId);
      if (
        !isSuperset(
          await user.access(tx, values),
          createV2AuthXScope(
            realm,
            {
              type: "authorization",
              authorizationId: "",
              grantId: "",
              clientId: "",
              userId: user.id
            },
            {
              basic: "*",
              scopes: "*",
              secrets: "*"
            }
          )
        )
      ) {
        throw new ForbiddenError(
          "You do not have permission to create this authorization"
        );
      }

      // Create a new authorization.
      const authorization = await Authorization.write(
        tx,
        {
          id: authorizationId,
          enabled: true,
          userId,
          grantId: null,
          secret: randomBytes(16).toString("hex"),
          scopes: [`${realm}:**:**`]
        },
        {
          recordId: v4(),
          createdByAuthorizationId: authorizationId,
          createdByCredentialId: credential.id,
          createdAt: new Date()
        }
      );

      // Invoke the new authorization, since it will be used for the remainder
      // of the request.
      await authorization.invoke(tx, {
        id: v4(),
        format: "basic",
        createdAt: new Date()
      });

      await tx.query("COMMIT");

      // Use this authorization for the remainder of the request.
      context.authorization = authorization;

      return authorization;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally {
      tx.release();
    }
  }
};
