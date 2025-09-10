import { GraphQLID, GraphQLNonNull, GraphQLBoolean, GraphQLString, GraphQLObjectType, } from "graphql";
import { GraphQLCredential, GraphQLUser, GraphQLNode, } from "@authx/authx";
import { OpenIdCredential } from "../model/index.js";
import { GraphQLOpenIdAuthority } from "./GraphQLOpenIdAuthority.js";
// Credential
// ----------
export const GraphQLOpenIdCredential = new GraphQLObjectType({
    name: "OpenIdCredential",
    interfaces: () => [GraphQLNode, GraphQLCredential],
    isTypeOf: (value) => value instanceof OpenIdCredential,
    fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        enabled: {
            type: new GraphQLNonNull(GraphQLBoolean),
        },
        user: {
            type: GraphQLUser,
            async resolve(credential, args, { realm, authorization: a, executor }) {
                if (!a)
                    return null;
                const user = await credential.user(executor);
                return (await user.isAccessibleBy(realm, a, executor)) ? user : null;
            },
        },
        authority: {
            type: GraphQLOpenIdAuthority,
            async resolve(credential, args, { executor }) {
                return credential.authority(executor);
            },
        },
        subject: {
            type: GraphQLString,
            resolve(credential) {
                return credential.authorityUserId;
            },
        },
    }),
});
//# sourceMappingURL=GraphQLOpenIdCredential.js.map