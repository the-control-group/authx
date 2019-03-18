import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from "graphql";

import {
  ContactName,
  ContactAddress,
  ContactOrganization,
  ContactAccount,
  ContactEmail,
  ContactUrl,
  ContactPhoneNumber,
  ContactIm,
  ContactPhoto,
  ContactTag,
  ContactRelationship,
  Contact
} from "../model";

export const GraphQLContactName: GraphQLObjectType<
  ContactName
> = new GraphQLObjectType({
  name: "ContactName",
  fields: () => ({
    formatted: {
      type: GraphQLString,
      description:
        "The full name, including all middle names, titles, and suffixes as appropriate, formatted for display (e.g. Mr. Joseph Robert Smarr, Esq.). This is the Primary Sub-Field for this field, for the purposes of sorting and filtering."
    },
    familyName: {
      type: GraphQLString,
      description:
        'The family name of this Contact, or "Last Name" in most Western languages (e.g. Smarr given the full name Mr. Joseph Robert Smarr, Esq.).'
    },
    givenName: {
      type: GraphQLString,
      description:
        'The given name of this Contact, or "First Name" in most Western languages (e.g. Joseph given the full name Mr. Joseph Robert Smarr, Esq.).'
    },
    middleName: {
      type: GraphQLString,
      description:
        "The middle name(s) of this Contact (e.g. Robert given the full name Mr. Joseph Robert Smarr, Esq.)."
    },
    honorificPrefix: {
      type: GraphQLString,
      description:
        'The honorific prefix(es) of this Contact, or "Title" in most Western languages (e.g. Mr. given the full name Mr. Joseph Robert Smarr, Esq.).'
    },
    honorificSuffix: {
      type: GraphQLString,
      description:
        'The honorifix suffix(es) of this Contact, or "Suffix" in most Western languages (e.g. Esq. given the full name Mr. Joseph Robert Smarr, Esq.).'
    }
  })
});

export const GraphQLContactAddress: GraphQLObjectType<
  ContactAddress
> = new GraphQLObjectType({
  name: "ContactAddress",
  fields: () => ({
    formatted: {
      type: GraphQLString,
      description:
        "The full mailing address, formatted for display or use with a mailing label. This field MAY contain newlines. This is the Primary Sub-Field for this field, for the purposes of sorting and filtering."
    },
    streetAddress: {
      type: GraphQLString,
      description:
        "The full street address component, which may include house number, street name, PO BOX, and multi-line extended street address information. This field MAY contain newlines."
    },
    locality: {
      type: GraphQLString,
      description: "The city or locality component."
    },
    region: {
      type: GraphQLString,
      description: "The state or region component."
    },
    postalCode: {
      type: GraphQLString,
      description: "The zipcode or postal code component."
    },
    country: { type: GraphQLString, description: "The country name component." }
  })
});

export const GraphQLContactOrganization: GraphQLObjectType<
  ContactOrganization
> = new GraphQLObjectType({
  name: "ContactOrganization",
  fields: () => ({
    name: {
      type: GraphQLString,
      description:
        "The name of the organization (e.g. company, school, or other organization). This field MUST have a non-empty value for each organization returned. This is the Primary Sub-Field for this field, for the purposes of sorting and filtering."
    },
    department: {
      type: GraphQLString,
      description: "The department within this organization."
    },
    title: {
      type: GraphQLString,
      description: "The job title or role within this organization."
    },
    type: {
      type: GraphQLString,
      description:
        "The type of organization, with Canonical Values job and school."
    },
    startDate: {
      type: GraphQLString,
      description:
        "The date this Contact joined this organization. This value SHOULD be a valid xs:date if possible, but MAY be an unformatted string, since it is recognized that this field is often presented as free-text."
    },
    endDate: {
      type: GraphQLString,
      description:
        "The date this Contact left this organization or the role specified by title within this organization. This value SHOULD be a valid xs:date if possible, but MAY be an unformatted string, since it is recognized that this field is often presented as free-text."
    },
    location: {
      type: GraphQLString,
      description:
        'The physical location of this organization. This may be a complete address, or an abbreviated location like "San Francisco".'
    },
    description: {
      type: GraphQLString,
      description:
        "A textual description of the role this Contact played in this organization. This field MAY contain newlines."
    }
  })
});

export const GraphQLContactAccount: GraphQLObjectType<
  ContactAccount
> = new GraphQLObjectType({
  name: "ContactAccount",
  fields: () => ({
    domain: {
      type: GraphQLString,
      description:
        'The top-most authoritative domain for this account, e.g. "twitter.com". This is the Primary Sub-Field for this field, for the purposes of sorting and filtering.'
    },
    username: {
      type: GraphQLString,
      description:
        'An alphanumeric user name, usually chosen by the user, e.g. "jsmarr".'
    },
    userid: {
      type: GraphQLString,
      description:
        'A user ID number, usually chosen automatically, and usually numeric but sometimes alphanumeric, e.g. "12345" or "1Z425A".'
    }
  })
});

const plural = {
  value: { type: new GraphQLNonNull(GraphQLString) },
  type: { type: GraphQLString },
  primary: { type: GraphQLBoolean }
};

export const GraphQLContactEmail: GraphQLObjectType<
  ContactEmail
> = new GraphQLObjectType({
  name: "ContactEmail",
  fields: plural
});

export const GraphQLContactUrl: GraphQLObjectType<
  ContactUrl
> = new GraphQLObjectType({
  name: "ContactUrl",
  fields: plural
});

export const GraphQLContactPhoneNumber: GraphQLObjectType<
  ContactPhoneNumber
> = new GraphQLObjectType({
  name: "ContactPhoneNumber",
  fields: plural
});

export const GraphQLContactIm: GraphQLObjectType<
  ContactIm
> = new GraphQLObjectType({
  name: "ContactIm",
  fields: plural
});

export const GraphQLContactPhoto: GraphQLObjectType<
  ContactPhoto
> = new GraphQLObjectType({
  name: "ContactPhoto",
  fields: plural
});

export const GraphQLContactTag: GraphQLObjectType<
  ContactTag
> = new GraphQLObjectType({
  name: "ContactTag",
  fields: plural
});

export const GraphQLContactRelationship: GraphQLObjectType<
  ContactRelationship
> = new GraphQLObjectType({
  name: "ContactRelationship",
  fields: plural
});

export const GraphQLContact: GraphQLObjectType<Contact> = new GraphQLObjectType(
  {
    name: "Contact",
    description:
      "Portable Contact. Schema defined by http://portablecontacts.net/draft-spec.html",
    fields: () => ({
      // fixed
      id: {
        type: new GraphQLNonNull(GraphQLID),
        description:
          "Unique identifier for the Contact. Each Contact returned MUST include a non-empty id value. This identifier MUST be unique across this user's entire set of Contacts, but MAY not be unique across multiple users' data. It MUST be a stable ID that does not change when the same contact is returned in subsequent requests. For instance, an e-mail address is not a good id, because the same person may use a different e-mail address in the future. Usually, in internal database ID will be the right choice here, e.g. \"12345\"."
      },

      // user configurable
      displayName: {
        type: GraphQLString,
        description:
          "The name of this Contact, suitable for display to end-users. Each Contact returned MUST include a non-empty displayName value. The name SHOULD be the full name of the Contact being described if known (e.g. Joseph Smarr or Mr. Joseph Robert Smarr, Esq.), but MAY be a username or handle, if that is all that is available (e.g. jsmarr). The value provided SHOULD be the primary textual label by which this Contact is normally displayed by the Service Provider when presenting it to end-users."
      },
      name: {
        type: GraphQLContactName,
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
      },

      // contextual
      connected: {
        type: new GraphQLNonNull(GraphQLBoolean),
        description:
          "Boolean value indicating whether the user and this Contact have established a bi-directionally asserted connection of some kind on the Service Provider's service. The value MUST be either true or false. The value MUST be true if and only if there is at least one value for the relationship field, described below, and is thus intended as a summary value indicating that some type of bi-directional relationship exists, for Consumers that aren't interested in the specific nature of that relationship. For traditional address books, in which a user stores information about other contacts without their explicit acknowledgment, or for services in which users choose to \"follow\" other users without requiring mutual consent, this value will always be false."
      },
      published: {
        type: GraphQLString,
        description:
          "The date this Contact was first added to the user's address book or friends list (i.e. the creation date of this entry). The value MUST be a valid xs:dateTime (e.g. 2008-01-23T04:56:22Z)."
      },
      updated: {
        type: GraphQLString,
        description:
          "The most recent date the details of this Contact were updated (i.e. the modified date of this entry). The value MUST be a valid xd:dateTime (e.g. 2008-01-23T04:56:22Z). If this Contact has never been modified since its initial creation, the value MUST be the same as the value of published."
      },

      // populated by credentials
      emails: {
        type: new GraphQLList(GraphQLContactEmail),
        description:
          "E-mail address for this Contact. The value SHOULD be canonicalized by the Service Provider, e.g. joseph@plaxo.com instead of joseph@PLAXO.COM."
      },
      urls: {
        type: new GraphQLList(GraphQLContactUrl),
        description:
          "URL of a web page relating to this Contact. The value SHOULD be canonicalized by the Service Provider, e.g. http://josephsmarr.com/about/ instead of JOSEPHSMARR.COM/about/. In addition to the standard Canonical Values for type, this field also defines the additional Canonical Values blog and contact."
      },
      phoneNumbers: {
        type: new GraphQLList(GraphQLContactPhoneNumber),
        description:
          "Phone number for this Contact. No canonical value is assumed here. In addition to the standard Canonical Values for type, this field also defines the additional Canonical Values mobile, fax, and pager."
      },
      ims: {
        type: new GraphQLList(GraphQLContactIm),
        description:
          "Instant messaging address for this Contact. No official canonicalization rules exist for all instant messaging addresses, but Service Providers SHOULD remove all whitespace and convert the address to lowercase, if this is appropriate for the service this IM address is used for. Instead of the standard Canonical Values for type, this field defines the following Canonical Values to represent currently popular IM services: aim, gtalk, icq, xmpp, msn, skype, qq, and yahoo."
      },
      photos: {
        type: new GraphQLList(GraphQLContactPhoto),
        description:
          "URL of a photo of this contact. The value SHOULD be a canonicalized URL, and MUST point to an actual image file (e.g. a GIF, JPEG, or PNG image file) rather than to a web page containing an image. Service Providers MAY return the same image at different sizes, though it is recognized that no standard for describing images of various sizes currently exists. Note that this field SHOULD NOT be used to send down arbitrary photos taken by this user, but specifically contact photos of the contact suitable for display when describing the contact."
      },
      tags: {
        type: new GraphQLList(GraphQLContactTag),
        description:
          'A user-defined category or label for this contact, e.g. "favorite" or "web20". These values SHOULD be case-insensitive, and there SHOULD NOT be multiple tags provided for a given contact that differ only in case. Note that this field is a Simple Field, meaning each instance consists only of a string value.'
      },
      relationships: {
        type: new GraphQLList(GraphQLContactRelationship),
        description:
          "A bi-directionally asserted relationship type that was established between the user and this contact by the Service Provider. The value SHOULD conform to one of the XFN relationship values (e.g. kin, friend, contact, etc.) if appropriate, but MAY be an alternative value if needed. Note this field is a parallel set of category labels to the tags field, but relationships MUST have been bi-directionally confirmed, whereas tags are asserted by the user without acknowledgment by this Contact. Note that this field is a Simple Field, meaning each instance consists only of a string value."
      },
      addresses: {
        type: new GraphQLList(GraphQLContactAddress),
        description:
          "The components of a physical mailing address. Service Providers MAY return just the full address as a single string in the formatted sub-field, or they MAY return just the individual component fields using the other sub-fields, or they MAY return both. If both variants are returned, they SHOULD be describing the same address, with the formatted address indicating how the component fields should be combined."
      },
      organizations: {
        type: new GraphQLList(GraphQLContactOrganization),
        description:
          "Describes a current or past organizational affiliation of this contact. Service Providers that support only a single Company Name and Job Title field should represent them with a single organization element with name and title properties, respectively."
      },
      accounts: {
        type: new GraphQLList(GraphQLContactAccount),
        description:
          "Describes an account held by this Contact, which MAY be on the Service Provider's service, or MAY be on a different service. Consumers SHOULD NOT assume that this account has been verified by the Service Provider to actually belong to this Contact. For each account, the domain is the top-most authoritative domain for this account, e.g. yahoo.com or reader.google.com, and MUST be non-empty. Each account must also contain a non-empty value for either username or userid, and MAY contain both, in which case the two values MUST be for the same account. These accounts can be used to determine if a user on one service is also known to be the same person on a different service, to facilitate connecting to people the user already knows on different services. If Consumers want to turn these accounts into contact URLs, they can use an open-source library like [google‑sgnodemapper]."
      }
    })
  }
);
