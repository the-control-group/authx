// @flow

import {
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from "graphql";

import GraphQLJSON from "graphql-type-json";
import {
  ProfileName,
  ProfileAddress,
  ProfileOrganization,
  ProfileAccount,
  ProfileEmail,
  ProfileUrl,
  ProfilePhoneNumber,
  ProfileIm,
  ProfilePhoto,
  ProfileTag,
  ProfileRelationship,
  Profile
} from "../util/Profile";

export const GraphQLProfileName: GraphQLObjectType<
  ProfileName
> = new GraphQLObjectType({
  name: "ProfileName",
  fields: () => ({
    formatted: { type: GraphQLString },
    familyName: { type: GraphQLString },
    givenName: { type: GraphQLString },
    middleName: { type: GraphQLString },
    honorificPrefix: { type: GraphQLString },
    honorificSuffix: { type: GraphQLString }
  })
});

export const GraphQLProfileAddress: GraphQLObjectType<
  ProfileAddress
> = new GraphQLObjectType({
  name: "ProfileAddress",
  fields: () => ({
    formatted: { type: GraphQLString },
    streetAddress: { type: GraphQLString },
    locality: { type: GraphQLString },
    region: { type: GraphQLString },
    postalCode: { type: GraphQLString },
    country: { type: GraphQLString }
  })
});

export const GraphQLProfileOrganization: GraphQLObjectType<
  ProfileOrganization
> = new GraphQLObjectType({
  name: "ProfileOrganization",
  fields: () => ({
    name: { type: GraphQLString },
    department: { type: GraphQLString },
    title: { type: GraphQLString },
    type: { type: GraphQLString },
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    location: { type: GraphQLString },
    description: { type: GraphQLString }
  })
});

export const GraphQLProfileAccount: GraphQLObjectType<
  ProfileAccount
> = new GraphQLObjectType({
  name: "ProfileAccount",
  fields: () => ({
    domain: { type: GraphQLString },
    username: { type: GraphQLString },
    userid: { type: GraphQLString }
  })
});

const plural = () => ({
  value: { type: new GraphQLNonNull(GraphQLString) },
  type: { type: GraphQLString },
  primary: { type: GraphQLBoolean }
});

export const GraphQLProfileEmail: GraphQLObjectType<
  ProfileEmail
> = new GraphQLObjectType({
  name: "ProfileEmail",
  fields: plural
});

export const GraphQLProfileUrl: GraphQLObjectType<
  ProfileUrl
> = new GraphQLObjectType({
  name: "ProfileUrl",
  fields: plural
});

export const GraphQLProfilePhoneNumber: GraphQLObjectType<
  ProfilePhoneNumber
> = new GraphQLObjectType({
  name: "ProfilePhoneNumber",
  fields: plural
});

export const GraphQLProfileIm: GraphQLObjectType<
  ProfileIm
> = new GraphQLObjectType({
  name: "ProfileIm",
  fields: plural
});

export const GraphQLProfilePhoto: GraphQLObjectType<
  ProfilePhoto
> = new GraphQLObjectType({
  name: "ProfilePhoto",
  fields: plural
});

export const GraphQLProfileTag: GraphQLObjectType<
  ProfileTag
> = new GraphQLObjectType({
  name: "ProfileTag",
  fields: plural
});

export const GraphQLProfileRelationship: GraphQLObjectType<
  ProfileRelationship
> = new GraphQLObjectType({
  name: "ProfileRelationship",
  fields: plural
});

export const GraphQLProfile: GraphQLObjectType<Profile> = new GraphQLObjectType(
  {
    name: "Profile",
    fields: () => ({
      // fixed
      id: { type: new GraphQLNonNull(GraphQLID) },

      // user configurable
      displayName: { type: GraphQLString },
      nickname: { type: GraphQLString },
      updated: { type: GraphQLString },
      birthday: { type: GraphQLString },
      anniversary: { type: GraphQLString },
      gender: { type: GraphQLString },
      note: { type: GraphQLString },
      preferredUsername: { type: GraphQLString },
      utcOffset: { type: GraphQLString },
      name: { type: GraphQLProfileName },

      // contextual
      connected: { type: new GraphQLNonNull(GraphQLBoolean) },
      published: { type: GraphQLString },

      // populated by credentials
      emails: { type: new GraphQLList(GraphQLProfileEmail) },
      urls: { type: new GraphQLList(GraphQLProfileUrl) },
      phoneNumbers: { type: new GraphQLList(GraphQLProfilePhoneNumber) },
      ims: { type: new GraphQLList(GraphQLProfileIm) },
      photos: { type: new GraphQLList(GraphQLProfilePhoto) },
      tags: { type: new GraphQLList(GraphQLProfileTag) },
      relationships: { type: new GraphQLList(GraphQLProfileRelationship) },
      addresses: { type: new GraphQLList(GraphQLProfileAddress) },
      organizations: { type: new GraphQLList(GraphQLProfileOrganization) },
      accounts: { type: new GraphQLList(GraphQLProfileAccount) }
    })
  }
);
