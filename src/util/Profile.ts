interface Plural {
  value: string;
  type?: string;
  primary?: boolean;
}

export interface Profile {
  // fixed
  id: string;
  connected: boolean; // default: false
  published?: string;

  // user configurable
  displayName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
  };
  nickname?: string;
  updated?: string;
  birthday?: string;
  anniversary?: string;
  gender?: string;
  note?: string;
  preferredUsername?: string;
  utcOffset?: string;

  // populated by credentials
  emails?: Plural[];
  urls?: Plural[];
  phoneNumbers?: Plural[];
  ims?: Plural[];
  photos?: Plural[];
  tags?: Plural[];
  relationships?: Plural[];
  addresses?: {
    formatted?: string;
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }[];
  organizations?: {
    name?: string;
    department?: string;
    title?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    description?: string;
  }[];
  accounts?: {
    domain?: string;
    username?: string;
    userid?: string;
  }[];
}
