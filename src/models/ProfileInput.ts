import { ProfileName } from "./Profile";

export interface ProfileInput {
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
}
