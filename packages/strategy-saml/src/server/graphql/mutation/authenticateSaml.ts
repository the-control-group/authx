import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import v4 from "uuid/v4";
import fetch from "node-fetch";
import FormData from "form-data";
import { IdentityProvider, ServiceProvider } from "saml2-js";

import {
  Context,
  GraphQLAuthorization,
  Authority,
  Authorization,
  User,
  Role,
  ForbiddenError,
  AuthenticationError
} from "@authx/authx";

import { EmailAuthority } from "@authx/strategy-email";

import { SamlAuthority, SamlCredential } from "../../model";

export const authenticateSaml: GraphQLFieldConfig<
  any,
  Context,
  {
    authorityId: string;
    code: string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    code: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "The OAuth authorization code provided by the OpenID exchange."
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap },
      base
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
        args.authorityId,
        authorityMap
      );

      if (!(authority instanceof SamlAuthority)) {
        throw new AuthenticationError(
          "The authority uses a strategy other than openid."
        );
      }

      // Instantiate the SAML identity provider.
      const idp = new IdentityProvider({
        /* eslint-disable @typescript-eslint/camelcase */
        sso_login_url: authority.details.idpLoginUrl,
        sso_logout_url: authority.details.idpLogoutUrl,
        certificates: authority.details.idpCertificates,
        force_authn: authority.details.forcesReauthentication,
        sign_get_request: true,
        allow_unencrypted_assertion: false
        /* eslint-enable */
      });

      const [privateKey, ...altPrivateKeys] = authority.details.spPrivateKeys;
      if (!privateKey) {
        throw new Error("No private key is configured for the SAML authority.");
      }

      const [
        certificate,
        ...altCertificates
      ] = authority.details.spCertificates;
      if (!privateKey) {
        throw new Error("No certificate is configured for the SAML authority.");
      }

      // Instantiate the SAML service provider.
      const sp = new ServiceProvider({
        /* eslint-disable @typescript-eslint/camelcase */
        entity_id: `${base}?authorityId=${args.authorityId}&metadata`,
        assert_endpoint: `${base}?authorityId=${args.authorityId}`,
        sign_get_request: true,
        allow_unencrypted_assertion: false,
        private_key: privateKey,
        certificate: certificate,
        alt_private_keys: altPrivateKeys,
        alt_certs: altCertificates
        /* eslint-enable */
      });

      // Fetch the assertion.
      const response = await new Promise((resolve, reject) => {
        sp.post_assert(
          idp,
          {
            /* eslint-disable @typescript-eslint/camelcase */
            request_body: {},

            // TODO: make this configurable
            ignore_signature: true,

            // TODO: make this configurable
            allow_unencrypted_assertion: true
            /* eslint-enable */
          },
          function(error, response) {
            if (error) return reject(error);
            resolve(response);
          }
        );
      });

      const samlUserId =
        (typeof response === "object" &&
          response &&
          typeof (response as { user?: {} }).user === "object" &&
          (response as { user?: {} }).user &&
          typeof (response as { user: { name_id?: string } }).user.name_id ===
            "string" &&
          (response as { user: { name_id: string } }).user.name_id) ||
        undefined;

      if (!samlUserId) {
        throw new Error("Invalid response returned by authority.");
      }

      const authorizationId = v4();

      // Get the credential
      let credential = await authority.credential(tx, samlUserId);

      // Try to associate an existing user by email.
      /*
      if (
        !credential &&
        authority.details.emailAuthorityId &&
        authority.details.matchesUsersByEmail &&
        token.email &&
        token.email_verified
      ) {
        const emailAuthority = await EmailAuthority.read(
          tx,
          authority.details.emailAuthorityId
        );

        const emailCredential =
          emailAuthority &&
          emailAuthority.enabled &&
          (await emailAuthority.credential(tx, token.email));

        if (emailCredential && emailCredential.enabled) {
          credential = await SamlCredential.write(
            tx,
            {
              enabled: true,
              id: v4(),
              userId: emailCredential.userId,
              authorityId: authority.id,
              authorityUserId: token.sub,
              details: {}
            },
            {
              recordId: v4(),
              createdByAuthorizationId: authorizationId,
              createdAt: new Date()
            }
          );
        }
      }

      // Create a new user.
      if (!credential && authority.details.createsUnmatchedUsers) {
        const user = await User.write(
          tx,
          {
            id: v4(),
            enabled: true,
            type: "human",
            name: token.name || ""
          },
          {
            recordId: v4(),
            createdByAuthorizationId: authorizationId,
            createdAt: new Date()
          }
        );

        credential = await SamlCredential.write(
          tx,
          {
            enabled: true,
            id: v4(),
            userId: user.id,
            authorityId: authority.id,
            authorityUserId: token.sub,
            details: {}
          },
          {
            recordId: v4(),
            createdByAuthorizationId: authorizationId,
            createdAt: new Date()
          }
        );

        // Assign the new user to the configured roles.
        if (
          authority.details.assignsCreatedUsersToRoleIds &&
          authority.details.assignsCreatedUsersToRoleIds.length
        ) {
          const roles = await Promise.all(
            authority.details.assignsCreatedUsersToRoleIds.map(id =>
              Role.read(tx, id)
            )
          );

          await roles.map(role =>
            Role.write(
              tx,
              {
                ...role,
                userIds: [...role.userIds, user.id]
              },
              {
                recordId: v4(),
                createdByAuthorizationId: authorizationId,
                createdAt: new Date()
              }
            )
          );
        }
      }
      */

      if (!credential) {
        throw new AuthenticationError("No such credential exists.");
      }

      // Create a new authorization.
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
