export interface ProfileName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface ProfileAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface ProfileOrganization {
  name?: string;
  department?: string;
  title?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
}

export interface ProfileAccount {
  domain?: string;
  username?: string;
  userid?: string;
}

interface Plural {
  value: string;
  type?: string;
  primary?: boolean;
}

export type ProfileEmail = Plural;
export type ProfileUrl = Plural;
export type ProfilePhoneNumber = Plural;
export type ProfileIm = Plural;
export type ProfilePhoto = Plural;
export type ProfileTag = Plural;
export type ProfileRelationship = Plural;

export interface Profile {
  // fixed
  id: string;

  // user configurable
  displayName: string;
  nickname?: string;
  updated?: string;
  birthday?: string;
  anniversary?: string;
  gender?: string;
  note?: string;
  preferredUsername?: string;
  utcOffset?: string;
  name?: ProfileName;

  // contextual
  connected: boolean; // default: false
  published?: string;

  // populated by credentials
  emails?: ProfileEmail[];
  urls?: ProfileUrl[];
  phoneNumbers?: ProfilePhoneNumber[];
  ims?: ProfileIm[];
  photos?: ProfilePhoto[];
  tags?: ProfileTag[];
  relationships?: ProfileRelationship[];
  addresses?: ProfileAddress[];
  organizations?: ProfileOrganization[];
  accounts?: ProfileAccount[];
}
