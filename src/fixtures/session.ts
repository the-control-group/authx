import { Session } from "../models";

export const session = [
  {
    data: new Session({
      id: "5387ece5-37a1-4573-a189-14333ebf8d88",
      enabled: true,
      grantId: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
      scopes: ["AuthX:**:**"]
    }),
    metadata: {
      recordId: "b741401e-fb12-4964-bbc7-0d32e3a35781",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Session({
      id: "c70da498-27ed-4c3b-a318-38bb220cef48",
      enabled: true,
      grantId: "e4670762-beb7-435c-94af-055b951f97e6",
      scopes: ["**:**:**"]
    }),
    metadata: {
      recordId: "ce1a45cd-af9c-42fb-9879-aec6bc8b12a1",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Session({
      id: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      enabled: true,
      grantId: "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
      scopes: ["**:**:**"]
    }),
    metadata: {
      recordId: "b1f8e470-4b3e-4470-a99b-f8bc235c71dd",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  }
];
