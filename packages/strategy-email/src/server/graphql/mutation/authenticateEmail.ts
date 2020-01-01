import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import v4 from "uuid/v4";

import {
  Context,
  GraphQLAuthorization,
  Authority,
  Authorization,
  ForbiddenError,
  AuthenticationError,
  User
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/dist/util/scopes";

import { isSuperset } from "@authx/scopes";
import { EmailAuthority } from "../../model";
import { substitute } from "../../substitute";

const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticateEmail: GraphQLFieldConfig<
  any,
  Context,
  {
    authorityId: string;
    email: string;
    proof: null | string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    email: {
      type: new GraphQLNonNull(GraphQLString)
    },
    proof: {
      type: GraphQLString
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap },
      sendMail,
      base
    } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");

      // fetch the authority
      const authority = await Authority.read(
        tx,
        args.authorityId,
        authorityMap
      );

      if (!(authority instanceof EmailAuthority)) {
        throw new AuthenticationError(
          __DEV__
            ? "The authority uses a strategy other than email."
            : undefined
        );
      }

      // get the credential
      const credential = await authority.credential(tx, args.email);
      if (!credential) {
        throw new AuthenticationError(
          __DEV__ ? "No such credential exists." : undefined
        );
      }

      // The user already has a proof that she controls the email.
      const { proof } = args;
      if (proof) {
        if (
          !authority.details.publicKeys.some(key => {
            try {
              const payload = jwt.verify(proof, key, {
                algorithms: ["RS512"]
              });

              // Make sure we're using the same email
              if ((payload as any).email !== args.email) {
                throw new ForbiddenError(
                  "This proof was generated for a different email address."
                );
              }

              // Make sure this is for the same user
              if ((payload as any).sub) {
                throw new ForbiddenError(
                  "This proof was generated for a specific user."
                );
              }

              return true;
            } catch (error) {
              if (error instanceof ForbiddenError) {
                throw error;
              }

              return false;
            }
          })
        ) {
          throw new ForbiddenError("The proof is invalid.");
        }
      }

      // The user needs to be sent a proof.
      else {
        const proofId = v4();

        // Generate a new proof
        const proof = jwt.sign(
          {
            email: args.email
          },
          authority.details.privateKey,
          {
            algorithm: "RS512",
            expiresIn: authority.details.proofValidityDuration,
            jwtid: proofId
          }
        );

        const url =
          base +
          `?authorityId=${authority.id}&proof=${encodeURIComponent(proof)}`;

        // TODO: Add a code to the credential

        // Send an email
        await sendMail({
          to: args.email,
          subject: authority.details.authenticationEmailSubject,
          text: substitute(
            { proof, url },
            authority.details.authenticationEmailText
          ),
          html: substitute(
            { proof, url },
            authority.details.authenticationEmailHtml
          )
        });

        throw new ForbiddenError(
          "An email has been sent to this address with a code that can be used to prove control."
        );
      }

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

      // create a new authorization
      const authorization = await Authorization.write(
        tx,
        {
          id: authorizationId,
          enabled: true,
          userId: credential.userId,
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

      await tx.query("COMMIT");

      // use this authorization for the rest of the request
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
