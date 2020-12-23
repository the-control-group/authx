import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";
import {
  AuthenticationError,
  Authorization,
  Context,
  DataLoaderExecutor,
  ForbiddenError,
  GraphQLAuthorization,
  ReadonlyDataLoaderExecutor,
  User,
} from "@authx/authx";
import { SamlAuthority } from "../../model/SamlAuthority";
import { PostAssertOptions } from "saml2-js";
import { v4 } from "uuid";
import { EmailAuthority, EmailCredential } from "@authx/strategy-email";
import { SamlCredential } from "../../model/SamlCredential";
import { isSuperset } from "@authx/scopes";
import { createV2AuthXScope } from "@authx/authx/dist/util/scopes";
import { randomBytes } from "crypto";
import { Pool, PoolClient } from "pg";
import { Role } from "@authx/authx/dist/model/Role";

const ATTRIBUTE_COMMON_NAME = "urn:oid:2.5.4.3";
const ATTRIBUTE_DISPLAY_NAME = "urn:oid:2.16.840.1.113730.3.1.241";
const ATTRIBUTE_EMAIL_ADDRESS = "urn:oid:0.9.2342.19200300.100.1.3";
const ATTRIBUTE_FIRST_NAME = "urn:oid:2.5.4.42";
const ATTRIBUTE_LAST_NAME = "urn:oid:2.5.4.4";

interface PostAssertResponse {
  user: {
    name_id: string;
    attributes: { [key: string]: string[] };
  };
}

/**
 * Finds an existing user by email address
 * @param tx
 * @param authority
 * @param emailAddress
 */
async function findUserByEmail(
  tx: DataLoaderExecutor<Pool | PoolClient>,
  authority: SamlAuthority,
  emailAddress: string
): Promise<User | null> {
  const emailAuthorityId = authority.details.emailAuthorityId;
  if (!emailAuthorityId)
    throw new Error("Expected emailAuthorityId to not be null");

  const emailAuthority = await EmailAuthority.read(tx, emailAuthorityId);

  const credential = await emailAuthority.credential(tx, emailAddress);

  if (credential) {
    return await User.read(tx, credential.userId);
  } else {
    return null;
  }
}

async function createUserByEmail(
  tx: PoolClient,
  authority: SamlAuthority,
  newAuthorizationId: string,
  emailAddress: string,
  userFullName: string
): Promise<User> {
  const emailAuthorityId = authority.details.emailAuthorityId;
  if (!emailAuthorityId)
    throw new Error("Expected emailAuthorityId to not be null");

  const user = await User.write(
    tx,
    {
      enabled: true,
      id: v4(),
      name: userFullName,
      type: "human",
    },
    {
      recordId: v4(),
      createdAt: new Date(),
      createdByAuthorizationId: newAuthorizationId,
    }
  );

  const roles = await Promise.all(
    authority.details.assignsCreatedUsersToRoleIds.map((id) =>
      Role.read(tx, id)
    )
  );

  const roleResults = await Promise.allSettled(
    roles.map((role) =>
      Role.write(
        tx,
        {
          ...role,
          userIds: [...role.userIds, user.id],
        },
        {
          recordId: v4(),
          createdByAuthorizationId: newAuthorizationId,
          createdAt: new Date(),
        }
      )
    )
  );

  for (const result of roleResults) {
    if (result.status === "rejected") {
      throw new Error(result.reason);
    }
  }

  await EmailCredential.write(
    tx,
    {
      authorityId: emailAuthorityId,
      authorityUserId: emailAddress,
      details: {},
      enabled: true,
      id: v4(),
      userId: user.id,
    },
    {
      recordId: v4(),
      createdAt: new Date(),
      createdByAuthorizationId: newAuthorizationId,
    }
  );

  return user;
}

async function createSamlCredentialForUser(
  tx: PoolClient,
  authority: SamlAuthority,
  user: User,
  newAuthorizationId: string,
  samlId: string
): Promise<SamlCredential> {
  return await SamlCredential.write(
    tx,
    {
      userId: user.id,
      id: v4(),
      enabled: true,
      details: {},
      authorityUserId: samlId,
      authorityId: authority.id,
    },
    {
      recordId: v4(),
      createdAt: new Date(),
      createdByAuthorizationId: newAuthorizationId,
    }
  );
}

export const authenticateSaml: GraphQLFieldConfig<
  any,
  Context,
  {
    authorityId: string;
    samlResponse: string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    authorityId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    samlResponse: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "The SAMLResponse, base64 encoded. Must contain an internal signature.",
    },
  },
  async resolve(source, args, context): Promise<Authorization> {
    const { executor, authorization: a, realm } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const tx = await pool.connect();
    try {
      // Make sure this transaction is used for queries made by the executor.
      const executor = new DataLoaderExecutor<Pool | PoolClient>(
        tx,
        strategies
      );

      await tx.query("BEGIN DEFERRABLE");

      const authority = await SamlAuthority.read(executor, args.authorityId);

      if (!(authority instanceof SamlAuthority)) {
        throw new AuthenticationError(
          "The authority uses a strategy other than SAML."
        );
      }

      const options: PostAssertOptions = {
        request_body: {
          SAMLResponse: args.samlResponse,
        },
      };

      const caller = async (): Promise<PostAssertResponse> => {
        return new Promise<PostAssertResponse>((resolve, reject) => {
          authority
            .serviceProvider(context.base)
            .post_assert(authority.identityProvider, options, (err, resp) => {
              if (err) {
                reject(err);
              } else {
                if (!resp.user.attributes) {
                  resp.user.attributes = {};
                }

                resolve(
                  resp as PostAssertResponse & {
                    user: { attributes: { [key: string]: string } };
                  }
                );
              }
            });
        });
      };

      const result = await caller();

      const validatedAccountId = result.user.name_id;

      if (!validatedAccountId) {
        throw new Error("Could not derive a valid account ID");
      }

      const authorizationId = v4();

      let credential = await authority.credential(executor, validatedAccountId);

      if (!credential && authority.details.matchesUsersByEmail) {
        const userEmail = result.user.attributes[ATTRIBUTE_EMAIL_ADDRESS]?.[0];
        if (userEmail) {
          const matchedUser = await findUserByEmail(
            executor,
            authority,
            userEmail
          );
          if (matchedUser) {
            credential = await createSamlCredentialForUser(
              tx,
              authority,
              matchedUser,
              authorizationId,
              validatedAccountId
            );
          } else if (authority.details.createsUnmatchedUsers) {
            let userFullName = "";

            for (const nameAttribute of [
              ATTRIBUTE_COMMON_NAME,
              ATTRIBUTE_DISPLAY_NAME,
            ]) {
              if (Array.isArray(result.user.attributes[nameAttribute])) {
                userFullName =
                  result.user.attributes[nameAttribute].find((it: any) => it) ??
                  "";
                break;
              }
            }

            if (
              !userFullName &&
              (result.user.attributes[ATTRIBUTE_FIRST_NAME] ||
                result.user.attributes[ATTRIBUTE_LAST_NAME])
            ) {
              userFullName = `${result.user.attributes[ATTRIBUTE_FIRST_NAME]} ${result.user.attributes[ATTRIBUTE_LAST_NAME]}`.trim();
            }

            const newUser = await createUserByEmail(
              tx,
              authority,
              authorizationId,
              userEmail,
              userFullName
            );

            credential = await createSamlCredentialForUser(
              tx,
              authority,
              newUser,
              authorizationId,
              validatedAccountId
            );
          }
        }
      }

      if (!credential) {
        throw new Error(
          `Could not find a credential linked with account ID ${validatedAccountId}`
        );
      }

      // Invoke the credential.
      await credential.invoke(executor, {
        id: v4(),
        createdAt: new Date(),
      });

      const values = {
        currentAuthorizationId: authorizationId,
        currentUserId: credential.userId,
        currentGrantId: null,
        currentClientId: null,
      };

      // Make sure the user can create new authorizations.
      const user = await User.read(executor, credential.userId);
      if (
        !isSuperset(
          await user.access(executor, values),
          createV2AuthXScope(
            context.realm,
            {
              type: "authorization",
              authorizationId: "",
              grantId: "",
              clientId: "",
              userId: user.id,
            },
            {
              basic: "*",
              scopes: "*",
              secrets: "*",
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
          userId: credential.userId,
          grantId: null,
          secret: randomBytes(16).toString("hex"),
          scopes: [`${realm}:**:**`],
        },
        {
          recordId: v4(),
          createdByAuthorizationId: authorizationId,
          createdByCredentialId: credential.id,
          createdAt: new Date(),
        }
      );

      // Invoke the new authorization, since it will be used for the remainder
      // of the request.
      await authorization.invoke(executor, {
        id: v4(),
        format: "basic",
        createdAt: new Date(),
      });

      await tx.query("COMMIT");

      // Clear and prime the loader.
      Authorization.clear(executor, authorization.id);
      Authorization.prime(executor, authorization.id, authorization);

      // Update the context to use a new executor primed with the results of
      // this mutation, using the original connection pool.
      executor.connection = pool;
      context.executor = executor as ReadonlyDataLoaderExecutor<Pool>;

      // Use this authorization for the rest of the request.
      context.authorization = authorization;

      return authorization;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally {
      tx.release();
    }
  },
};
