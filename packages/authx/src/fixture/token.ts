import { PoolClient } from "pg";
import { Token } from "../model";

export const token = [
  {
    id: "5387ece5-37a1-4573-a189-14333ebf8d88",
    insert: (tx: PoolClient) =>
      Token.write(
        tx,
        {
          id: "5387ece5-37a1-4573-a189-14333ebf8d88",
          enabled: true,
          userId: "e165cbb0-86b0-4e11-9db7-eb5f742161b8",
          grantId: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
          credentialId: null,
          secret:
            "c8ad0dd621b819dceb95baac0d3f2e106b438bfbc5b1c811009c763de5dea1a4",
          scopes: ["AuthX:**:**"]
        },
        {
          recordId: "b741401e-fb12-4964-bbc7-0d32e3a35781",
          createdByTokenId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "c70da498-27ed-4c3b-a318-38bb220cef48",
    insert: (tx: PoolClient) =>
      Token.write(
        tx,
        {
          id: "c70da498-27ed-4c3b-a318-38bb220cef48",
          enabled: true,
          userId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          grantId: "e4670762-beb7-435c-94af-055b951f97e6",
          credentialId: null,
          secret:
            "8f57395ecd9d6fcb884145f8f6feff357fead2fbd83607e87d71a7c372cf37ad",
          scopes: ["**:**:**"]
        },
        {
          recordId: "ce1a45cd-af9c-42fb-9879-aec6bc8b12a1",
          createdByTokenId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
    insert: (tx: PoolClient) =>
      Token.write(
        tx,
        {
          id: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          enabled: true,
          userId: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          grantId: "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
          credentialId: null,
          secret:
            "6fac10e63eaed0835a9c263273dcf274b6751fd356d6bea04694510757d1646d",
          scopes: ["**:**:**"]
        },
        {
          recordId: "b1f8e470-4b3e-4470-a99b-f8bc235c71dd",
          createdByTokenId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  }
];
