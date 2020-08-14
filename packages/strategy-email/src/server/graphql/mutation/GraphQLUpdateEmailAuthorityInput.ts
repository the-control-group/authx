import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
} from "graphql";

export const GraphQLUpdateEmailAuthorityInput = new GraphQLInputObjectType({
  name: "UpdateEmailAuthorityInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
    name: {
      type: GraphQLString,
      description: "The name of the authority.",
    },
    description: {
      type: GraphQLString,
      description: "A description of the authority.",
    },
    privateKey: {
      type: GraphQLString,
      description:
        "The RS512 private key that will be used to sign the proofs sent to verify ownership of email addresses.",
    },
    addPublicKeys: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description:
        "Add a key to the list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses. This allows private keys to be rotated without invalidating current proofs.",
    },
    removePublicKeys: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description:
        "Remove a key from the list of RS512 public keys that will be used to verify the proofs sent to verify ownership of email addresses.",
    },
    proofValidityDuration: {
      type: GraphQLInt,
      description: "Time in seconds until the email link expires.",
    },
    authenticationEmailSubject: {
      type: GraphQLString,
      description:
        "Authentication Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
    },
    authenticationEmailText: {
      type: GraphQLString,
      description:
        "Authentication Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
    },
    authenticationEmailHtml: {
      type: GraphQLString,
      description:
        "Authentication Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
    },
    verificationEmailSubject: {
      type: GraphQLString,
      description:
        "Verification Email Subject. Handlebars template used to generate the email subject. Provided `authorization`, `credential`, and `url`.",
    },
    verificationEmailText: {
      type: GraphQLString,
      description:
        "Verification Email Plain Text Body. Handlebars template used to generate the email plain text body. Provided `authorization`, `credential`, and `url`.",
    },
    verificationEmailHtml: {
      type: GraphQLString,
      description:
        "Verification Email HTML Body. Handlebars template used to generate the email HTML body. Provided `authorization`, `credential`, and `url`.",
    },
  }),
});
