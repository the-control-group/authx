import { GraphQLID, GraphQLNonNull, GraphQLBoolean, GraphQLString, GraphQLObjectType, } from "graphql";
import { GraphQLCredential, GraphQLUser, GraphQLNode, } from "@authx/authx";
import { EmailCredential } from "../model/index.js";
import { GraphQLEmailAuthority } from "./GraphQLEmailAuthority.js";
// Credential
// ----------
export const GraphQLEmailCredential = new GraphQLObjectType({
    name: "EmailCredential",
    interfaces: () => [GraphQLNode, GraphQLCredential],
    isTypeOf: (value) => value instanceof EmailCredential,
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
            type: GraphQLEmailAuthority,
            async resolve(credential, args, { executor }) {
                return credential.authority(executor);
            },
        },
        email: {
            type: GraphQLString,
            resolve(credential) {
                return credential.authorityUserId;
            },
        },
    }),
});
//# sourceMappingURL=GraphQLEmailCredential.js.map