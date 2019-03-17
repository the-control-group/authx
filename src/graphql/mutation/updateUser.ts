import v4 from "uuid/v4";
import {
  GraphQLID,
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull
} from "graphql";

import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLContactInput } from "../GraphQLContactInput";
import { User, ContactName, ContactInput } from "../../models";
import { ForbiddenError } from "../../errors";

export const updateUser: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    contact: null | ContactInput;
  },
  Context
> = {
  type: GraphQLUser,
  description: "Update a new user.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    contact: {
      type: GraphQLContactInput
    }
  },
  async resolve(source, args, context): Promise<User> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a token.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await User.read(tx, args.id);

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this user."
        );
      }

      const user = await User.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          contact: {
            displayName:
              args.contact && typeof args.contact.displayName === "string"
                ? args.contact.displayName
                : before.contact.displayName,
            name:
              args.contact && args.contact.name
                ? {
                    formatted:
                      args.contact &&
                      typeof args.contact.name.formatted === "string"
                        ? args.contact.name.formatted || null
                        : before.contact.name
                        ? before.contact.name.formatted
                        : null,
                    familyName:
                      args.contact &&
                      typeof args.contact.name.familyName === "string"
                        ? args.contact.name.familyName || null
                        : before.contact.name
                        ? before.contact.name.familyName
                        : null,
                    givenName:
                      args.contact &&
                      typeof args.contact.name.givenName === "string"
                        ? args.contact.name.givenName || null
                        : before.contact.name
                        ? before.contact.name.givenName
                        : null,
                    middleName:
                      args.contact &&
                      typeof args.contact.name.middleName === "string"
                        ? args.contact.name.middleName || null
                        : before.contact.name
                        ? before.contact.name.middleName
                        : null,
                    honorificPrefix:
                      args.contact &&
                      typeof args.contact.name.honorificPrefix === "string"
                        ? args.contact.name.honorificPrefix || null
                        : before.contact.name
                        ? before.contact.name.honorificPrefix
                        : null,
                    honorificSuffix:
                      args.contact &&
                      typeof args.contact.name.honorificSuffix === "string"
                        ? args.contact.name.honorificSuffix || null
                        : before.contact.name
                        ? before.contact.name.honorificSuffix
                        : null
                  }
                : before.contact.name,
            nickname:
              args.contact && typeof args.contact.nickname === "string"
                ? args.contact.nickname || null
                : before.contact.nickname,
            birthday:
              args.contact && typeof args.contact.birthday === "string"
                ? args.contact.birthday || null
                : before.contact.birthday,
            anniversary:
              args.contact && typeof args.contact.anniversary === "string"
                ? args.contact.anniversary || null
                : before.contact.anniversary,
            gender:
              args.contact && typeof args.contact.gender === "string"
                ? args.contact.gender || null
                : before.contact.gender,
            note:
              args.contact && typeof args.contact.note === "string"
                ? args.contact.note || null
                : before.contact.note,
            preferredUsername:
              args.contact && typeof args.contact.preferredUsername === "string"
                ? args.contact.preferredUsername || null
                : before.contact.preferredUsername,
            utcOffset:
              args.contact && typeof args.contact.utcOffset === "string"
                ? args.contact.utcOffset || null
                : before.contact.utcOffset
          }
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return user;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
