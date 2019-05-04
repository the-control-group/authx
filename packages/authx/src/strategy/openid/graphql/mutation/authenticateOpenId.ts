import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import v4 from "uuid/v4";

import { Context } from "../../../../Context";
import { GraphQLAuthorization } from "../../../../graphql";
import { Authority, Authorization } from "../../../../model";
import { ForbiddenError, AuthenticationError } from "../../../../errors";
import { OpenIdAuthority } from "../../model";
import { substitute } from "../../substitute";

const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticateOpenId: GraphQLFieldConfig<
  any,
  {
    authorityId: string;
    code: string;
  },
  Context
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    code: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const {
      tx,
      authorization: a,
      realm,
      strategies: { authorityMap },
      sendMail,
      base
    } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      // fetch the authority
      const authority = await Authority.read(
        tx,
        args.authorityId,
        authorityMap
      );

      if (!(authority instanceof OpenIdAuthority)) {
        throw new AuthenticationError(
          __DEV__
            ? "The authority uses a strategy other than openid."
            : undefined
        );
      }

      // get the credential
      const credential = await authority.credential(tx, args.openid);
      if (!credential) {
        throw new AuthenticationError(
          __DEV__ ? "No such credential exists." : undefined
        );
      }

      // The user already has a proof that she controls the openid.
      const { proof } = args;
      if (proof) {
        if (
          !authority.details.publicKeys.some(key => {
            try {
              const payload = jwt.verify(proof, key, {
                algorithms: ["RS512"]
              });

              // Make sure we're using the same openid
              if ((payload as any).openid !== args.openid) {
                throw new ForbiddenError(
                  "This proof was generated for a different openid address."
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
            openid: args.openid
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

        // Send an openid
        await sendMail({
          to: args.openid,
          subject: authority.details.authenticationOpenIdSubject,
          text: substitute(
            { proof, url },
            authority.details.authenticationOpenIdText
          ),
          html: substitute(
            { proof, url },
            authority.details.authenticationOpenIdHtml
          )
        });

        throw new ForbiddenError(
          "An openid has been sent to this address with a code that can be used to prove control."
        );
      }

      // create a new authorization
      const authorizationId = v4();
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
    }
  }
};
