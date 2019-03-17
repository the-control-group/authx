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
import { GraphQLProfileNameInput } from "../GraphQLProfileInput";
import { User, ProfileName } from "../../models";
import { ForbiddenError } from "../../errors";

export const updateUser: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    displayName: null | string;
    name: null | ProfileName;
    nickname: null | string;
    birthday: null | string;
    anniversary: null | string;
    gender: null | string;
    note: null | string;
    preferredUsername: null | string;
    utcOffset: null | string;
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
    displayName: {
      type: GraphQLString,
      description:
        "The name of this Contact, suitable for display to end-users. Each Contact returned MUST include a non-empty displayName value. The name SHOULD be the full name of the Contact being described if known (e.g. Joseph Smarr or Mr. Joseph Robert Smarr, Esq.), but MAY be a username or handle, if that is all that is available (e.g. jsmarr). The value provided SHOULD be the primary textual label by which this Contact is normally displayed by the Service Provider when presenting it to end-users."
    },
    name: {
      type: GraphQLProfileNameInput,
      description:
        "The components of the contact's real name. Providers MAY return just the full name as a single string in the formatted sub-field, or they MAY return just the individual component fields using the other sub-fields, or they MAY return both. If both variants are returned, they SHOULD be describing the same name, with the formatted name indicating how the component fields should be combined."
    },
    nickname: {
      type: GraphQLString,
      description:
        'The casual way to address this Contact in real life, e.g. "Bob" or "Bobby" instead of "Robert". This field SHOULD NOT be used to represent a user\'s username (e.g. jsmarr or daveman692); the latter should be represented by the preferredUsername field.'
    },
    birthday: {
      type: GraphQLString,
      description:
        "The birthday of this contact. The value MUST be a valid xs:date (e.g. 1975-02-14. The year value MAY be set to 0000 when the age of the Contact is private or the year is not available."
    },
    anniversary: {
      type: GraphQLString,
      description:
        "The wedding anniversary of this contact. The value MUST be a valid xs:date (e.g. 1975-02-14. The year value MAY be set to 0000 when the year is not available."
    },
    gender: {
      type: GraphQLString,
      description:
        "The gender of this contact. Service Providers SHOULD return one of the following Canonical Values, if appropriate: male, female, or undisclosed, and MAY return a different value if it is not covered by one of these Canonical Values."
    },
    note: {
      type: GraphQLString,
      description:
        "Notes about this contact, with an unspecified meaning or usage (normally contact notes by the user about this contact). This field MAY contain newlines."
    },
    preferredUsername: {
      type: GraphQLString,
      description:
        "The preferred username of this contact on sites that ask for a username (e.g. jsmarr or daveman692). This field may be more useful for describing the owner (i.e. the value when /@me/@self is requested) than the user's contacts, e.g. Consumers MAY wish to use this value to pre-populate a username for this user when signing up for a new service."
    },
    utcOffset: {
      type: GraphQLString,
      description:
        "The offset from UTC of this Contact's current time zone, as of the time this response was returned. The value MUST conform to the offset portion of xs:dateTime, e.g. -08:00. Note that this value MAY change over time due to daylight saving time, and is thus meant to signify only the current value of the user's timezone offset."
    }
  },
  async resolve(source, args, context): Promise<User> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a token.");
    }

    if (
      // can update any user
      !(await t.can(tx, `${realm}:user.*:write.basic`)) &&
      !(
        (await t.can(tx, `${realm}:user.self:write.basic`)) &&
        args.id === t.userId
      )
    ) {
      throw new ForbiddenError("You do not have permission to update a user.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await User.read(tx, args.id);
      const user = await User.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          displayName:
            typeof args.displayName === "string"
              ? args.displayName
              : before.displayName,
          name: args.name
            ? {
                formatted:
                  typeof args.name.formatted === "string"
                    ? args.name.formatted || null
                    : before.name
                    ? before.name.formatted
                    : null,
                familyName:
                  typeof args.name.familyName === "string"
                    ? args.name.familyName || null
                    : before.name
                    ? before.name.familyName
                    : null,
                givenName:
                  typeof args.name.givenName === "string"
                    ? args.name.givenName || null
                    : before.name
                    ? before.name.givenName
                    : null,
                middleName:
                  typeof args.name.middleName === "string"
                    ? args.name.middleName || null
                    : before.name
                    ? before.name.middleName
                    : null,
                honorificPrefix:
                  typeof args.name.honorificPrefix === "string"
                    ? args.name.honorificPrefix || null
                    : before.name
                    ? before.name.honorificPrefix
                    : null,
                honorificSuffix:
                  typeof args.name.honorificSuffix === "string"
                    ? args.name.honorificSuffix || null
                    : before.name
                    ? before.name.honorificSuffix
                    : null
              }
            : before.name,
          nickname:
            typeof args.nickname === "string"
              ? args.nickname || null
              : before.nickname,
          birthday:
            typeof args.birthday === "string"
              ? args.birthday || null
              : before.birthday,
          anniversary:
            typeof args.anniversary === "string"
              ? args.anniversary || null
              : before.anniversary,
          gender:
            typeof args.gender === "string"
              ? args.gender || null
              : before.gender,
          note: typeof args.note === "string" ? args.note || null : before.note,
          preferredUsername:
            typeof args.preferredUsername === "string"
              ? args.preferredUsername || null
              : before.preferredUsername,
          utcOffset:
            typeof args.utcOffset === "string"
              ? args.utcOffset || null
              : before.utcOffset
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
