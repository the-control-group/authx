import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";

import { Context, GraphQLAuthority, GraphQLNode } from "@authx/authx";
import { SamlAuthority } from "../model";
import { GraphQLRole } from "@authx/authx/dist/graphql/GraphQLRole";
import { Role } from "@authx/authx/dist/model/Role";

export async function filter<T>(
  iter: Iterable<T>,
  callback: (item: T, index: number) => boolean | Promise<boolean>
): Promise<T[]> {
  const result: T[] = [];
  await Promise.all(
    [...iter].map(async (item: T, index: number) => {
      if (await callback(item, index)) result.push(item);
    })
  );

  return result;
}

// Authority
// ---------

export const GraphQLSamlAuthority = new GraphQLObjectType<
  SamlAuthority,
  Context
>({
  name: "SamlAuthority",
  interfaces: () => [GraphQLNode, GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof SamlAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    metadata: {
      type: GraphQLString,
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { base }: Context
      ): Promise<null | string> {
        return Buffer.from(
          authority.serviceProvider(base).create_metadata(),
          "utf8"
        ).toString("base64");
      },
    },
    authUrlWithParams: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "URL the user is to be redirected to for SAML login with SAMLRequest appended",
      resolve(authority, args, { base }: Context): Promise<null | string> {
        return new Promise<null | string>((resolve, reject) => {
          authority
            .serviceProvider(base)
            .create_login_request_url(
              authority.identityProvider,
              {},
              (err, loginUrl) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(loginUrl);
                }
              }
            );
        });
      },
    },
    entityId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.entityId
          : null;
      },
    },
    serviceProviderPrivateKey: {
      type: new GraphQLNonNull(GraphQLString),
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.serviceProviderPrivateKey
          : null;
      },
    },
    serviceProviderCertificate: {
      type: new GraphQLNonNull(GraphQLString),
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.serviceProviderCertificate
          : null;
      },
    },
    assertEndpoint: {
      type: new GraphQLNonNull(GraphQLString),
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { base }: Context
      ): Promise<null | string> {
        return authority.assertEndpoint(base);
      },
    },
    emailAuthorityId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.emailAuthorityId
          : null;
      },
    },
    authUrl: {
      type: new GraphQLNonNull(GraphQLString),
      description: "SAML XML Metadata, as a base64 encoded string",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.authUrl
          : null;
      },
    },
    matchesUsersByEmail: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we lookup the user by email address?",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | boolean> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.matchesUsersByEmail
          : null;
      },
    },
    createsUnmatchedUsers: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we create a new one?",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | boolean> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.createsUnmatchedUsers
          : null;
      },
    },
    assignsCreatedUsersToRoles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLRole))
      ) as any,
      description: "When a user is created, assign to these roles.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | Role[]> {
        if (
          !a ||
          !(await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
        ) {
          return null;
        }

        return filter(
          await authority.assignsCreatedUsersToRoles(executor),
          (role) => role.isAccessibleBy(realm, a, executor)
        );
      },
    },
    identityProviderCertificates: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      ) as any,
      description: "When a user is created, assign to these roles.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string[]> {
        if (
          !a ||
          !(await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
        ) {
          return null;
        }

        return authority.details.identityProviderCertificates;
      },
    },
  }),
});
