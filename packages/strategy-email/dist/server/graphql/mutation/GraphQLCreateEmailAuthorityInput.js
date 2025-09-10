import { GraphQLID, GraphQLNonNull, GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLInputObjectType, GraphQLList, } from "graphql";
import { GraphQLAdministrationInput } from "@authx/authx";
export const GraphQLCreateEmailAuthorityInput = new GraphQLInputObjectType({
    name: "CreateEmailAuthorityInput",
    fields: () => ({
        id: {
            type: GraphQLID,
            description: "Optional UUID to use for the new authority.",
        },
        enabled: {
            type: GraphQLBoolean,
            defaultValue: true,
        },
        name: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The name of the authority.",
        },
        description: {
            type: new GraphQLNonNull(GraphQLString),
            description: "A description of the authority.",
        },
        privateKey: {
            type: new GraphQLNonNull(GraphQLString),
            description: "The RS512 private key that will be used to sign the proofs sent to verify ownership of email addresses.",
        },
        publicKeys: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))),
            description: "A list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses.",
        },
        proofValidityDuration: {
            type: GraphQLInt,
            description: "Time in seconds until an email link expires.",
            defaultValue: 900,
        },
        authenticationEmailSubject: {
            type: GraphQLString,
            description: "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
            defaultValue: "Authenticate by email",
        },
        authenticationEmailText: {
            type: GraphQLString,
            description: "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
            defaultValue: "Please authenticate at the following URL: {{{url}}}",
        },
        authenticationEmailHtml: {
            type: GraphQLString,
            description: "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
            defaultValue: 'Please click <a href="{{url}}">here</a> to authenticate.',
        },
        verificationEmailSubject: {
            type: GraphQLString,
            description: "Verification Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
            defaultValue: "Verify email",
        },
        verificationEmailText: {
            type: GraphQLString,
            description: "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
            defaultValue: "Please verify this email at the following URL: {{{url}}}",
        },
        verificationEmailHtml: {
            type: GraphQLString,
            description: "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
            defaultValue: 'Please click <a href="{{url}}">here</a> to verify this email.',
        },
        administration: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
            description: "An optional list of roles to which scopes will be added for the purpose of administering the created authority.",
            defaultValue: [],
        },
    }),
});
//# sourceMappingURL=GraphQLCreateEmailAuthorityInput.js.map