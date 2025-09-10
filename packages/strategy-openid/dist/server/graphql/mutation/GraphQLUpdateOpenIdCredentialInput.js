import { GraphQLID, GraphQLNonNull, GraphQLBoolean, GraphQLInputObjectType, } from "graphql";
export const GraphQLUpdateOpenIdCredentialInput = new GraphQLInputObjectType({
    name: "UpdateOpenIdCredentialInput",
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLID),
        },
        enabled: {
            type: GraphQLBoolean,
        },
    }),
});
//# sourceMappingURL=GraphQLUpdateOpenIdCredentialInput.js.map