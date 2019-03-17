export interface ContactName {
  formatted: null | string;
  familyName: null | string;
  givenName: null | string;
  middleName: null | string;
  honorificPrefix: null | string;
  honorificSuffix: null | string;
}

export interface ContactAddress {
  formatted: null | string;
  streetAddress: null | string;
  locality: null | string;
  region: null | string;
  postalCode: null | string;
  country: null | string;
}

export interface ContactOrganization {
  name: null | string;
  department: null | string;
  title: null | string;
  type: null | string;
  startDate: null | string;
  endDate: null | string;
  location: null | string;
  description: null | string;
}

export interface ContactAccount {
  domain: null | string;
  username: null | string;
  userid: null | string;
}

interface Plural {
  value: string;
  type: null | string;
  primary: null | boolean;
}

export type ContactEmail = Plural;
export type ContactUrl = Plural;
export type ContactPhoneNumber = Plural;
export type ContactIm = Plural;
export type ContactPhoto = Plural;
export type ContactTag = Plural;
export type ContactRelationship = Plural;

export interface Contact {
  // fixed
  id: string;

  // user configurable
  displayName: string;
  name: null | ContactName;
  nickname: null | string;
  birthday: null | string;
  anniversary: null | string;
  gender: null | string;
  note: null | string;
  preferredUsername: null | string;
  utcOffset: null | string;

  // contextual
  connected: null | boolean; // default: false
  published: null | string;
  updated: null | string;

  // populated by credentials
  emails: null | ContactEmail[];
  urls: null | ContactUrl[];
  phoneNumbers: null | ContactPhoneNumber[];
  ims: null | ContactIm[];
  photos: null | ContactPhoto[];
  tags: null | ContactTag[];
  relationships: null | ContactRelationship[];
  addresses: null | ContactAddress[];
  organizations: null | ContactOrganization[];
  accounts: null | ContactAccount[];
}
