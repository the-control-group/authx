import { ContactName } from "./Contact";

export interface ContactInput {
  displayName: null | string;
  name: null | ContactName;
  nickname: null | string;
  birthday: null | string;
  anniversary: null | string;
  gender: null | string;
  note: null | string;
  preferredUsername: null | string;
  utcOffset: null | string;
}

export type ContactInitialInput = ContactInput & {
  displayName: string;
};
