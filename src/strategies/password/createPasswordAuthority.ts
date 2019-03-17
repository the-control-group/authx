import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { compare } from "bcrypt";

import { Context } from "../../graphql/Context";
import { Authority } from "../../models";

import { PasswordAuthority, PasswordCredential } from "./models";

export const GraphQLCreatePasswordAuthorityResult = new GraphQLObjectType({
  name: "createPasswordAuthorityResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    client: { type: GraphQLClient }
  })
});

export const createPasswordAuthority: GraphQLFieldConfig<
  any,
  {
    identityAuthorityId: string;
    identityAuthorityUserId: string;
    authorityId: string;
    password: string;
  },
  Context
> = {
  type: GraphQLCreatePasswordAuthorityResult,
  description: "Create a new token.",
  args: {
    identityAuthorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    identityAuthorityUserId: {
      type: new GraphQLNonNull(GraphQLString)
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    password: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm, authorityMap } = context;

    if (!t) {
      throw new Error("You must be authenticated to create an authority.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      // fetch the authority
      const authority = Authority.read(tx, args.authorityId, authorityMap);
      if (!(authority instanceof PasswordAuthority)) {
        throw new Error("The authority uses a strategy other than password.");
      }

      // find the user ID given identityAuthorityId and identityAuthorityUserId
      var userId: string | null;
      if (args.identityAuthorityId === authority.id) {
        userId = args.identityAuthorityUserId;
      } else {
        const results = await tx.query(
          `
          SELECT user_id
          FROM authx.credential_record
          WHERE
            authority_id = $1
            AND authority_user_id = $2
            AND enabled = true
            AND replacement_record_id IS NULL
        `,
          [args.identityAuthorityId, args.identityAuthorityUserId]
        );

        if (results.rows.length > 1) {
          throw new Error(
            "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
          );
        }

        userId = results.rows.length ? results.rows[0].user_id : null;
        if (!userId) {
          throw new Error("Unable to find user identity.");
        }
      }

      // get the credential
      const credential = await authority.credential(tx, userId);
      if (!credential) {
        throw new Error("No such credential exists.");
      }

      // check the password
      if (!(await compare(args.password, credential.details.hash))) {
        throw new Error("The password is incorrect.");
      }

      return true;
    } catch (error) {
      console.error(error);
      await tx.query("ROLLBACK");
      return {
        success: false,
        message: "Authentication failed.",
        token: null
      };
    }
  }
};
