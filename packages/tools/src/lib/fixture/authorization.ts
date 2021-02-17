import { ClientBase } from "pg";
import { Authorization } from "@authx/authx";

export const authorization = [
  {
    id: "5387ece5-37a1-4573-a189-14333ebf8d88",
    insert: (tx: ClientBase): Promise<Authorization> =>
      Authorization.write(
        tx,
        {
          id: "5387ece5-37a1-4573-a189-14333ebf8d88",
          enabled: true,
          userId: "e165cbb0-86b0-4e11-9db7-eb5f742161b8",
          grantId: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
          secret:
            "c8ad0dd621b819dceb95baac0d3f2e106b438bfbc5b1c811009c763de5dea1a4",
          scopes: ["AuthX:**:**"],
        },
        {
          recordId: "b741401e-fb12-4964-bbc7-0d32e3a35781",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdByCredentialId: null,
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
  {
    id: "c70da498-27ed-4c3b-a318-38bb220cef48",
    insert: (tx: ClientBase): Promise<Authorization> =>
      Authorization.write(
        tx,
        {
          id: "c70da498-27ed-4c3b-a318-38bb220cef48",
          enabled: true,
          userId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          grantId: "e4670762-beb7-435c-94af-055b951f97e6",
          secret:
            "8f57395ecd9d6fcb884145f8f6feff357fead2fbd83607e87d71a7c372cf37ad",
          scopes: ["**:**:**"],
        },
        {
          recordId: "ce1a45cd-af9c-42fb-9879-aec6bc8b12a1",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdByCredentialId: null,
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
  {
    id: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
    insert: (tx: ClientBase): Promise<Authorization> =>
      Authorization.write(
        tx,
        {
          id: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          enabled: true,
          userId: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          grantId: "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
          secret:
            "6fac10e63eaed0835a9c263273dcf274b6751fd356d6bea04694510757d1646d",
          scopes: ["**:**:**"],
        },
        {
          recordId: "b1f8e470-4b3e-4470-a99b-f8bc235c71dd",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdByCredentialId: null,
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
  {
    id: "6d648342-5b7b-4aaf-8924-3ae3bf54966d",
    insert: (tx: ClientBase): Promise<Authorization> =>
      Authorization.write(
        tx,
        {
          id: "6d648342-5b7b-4aaf-8924-3ae3bf54966d",
          enabled: true,
          userId: "dc396449-2c7d-4a23-a159-e6415ded71d2",
          grantId: null,
          secret:
            "49903234add7ffb86d54be39e99e4c128a70d718317d78c9198ee041ab9109b7",
          scopes: ["**:**:**"],
        },
        {
          recordId: "6b942955-60c5-468c-b3fc-d321fb7095ee",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdByCredentialId: null,
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
  {
    id: "9883c6dc-7480-49d8-ae70-d50aab59205d",
    insert: (tx: ClientBase): Promise<Authorization> =>
      Authorization.write(
        tx,
        {
          id: "9883c6dc-7480-49d8-ae70-d50aab59205d",
          enabled: true,
          userId: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
          grantId: "3fc15344-13f6-4863-91e9-c8ab09cfb4b7",
          secret:
            "bf5224549f5b9c3264ebb296827e76938be7c8fe34080d67acb08d5aea89e0db",
          scopes: ["**:**:**"],
        },
        {
          recordId: "2a6ae2b0-b3f0-4401-b29a-4e5ba24684d8",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdByCredentialId: null,
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
  {
    id: "5de5d381-6257-4930-863b-5517402a67f7",
    insert: (tx: ClientBase): Promise<Authorization> =>
      Authorization.write(
        tx,
        {
          id: "5de5d381-6257-4930-863b-5517402a67f7",
          enabled: false,
          userId: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
          grantId: null,
          secret:
            "f3251a35903ae20208602bb38d5209c247d020d616a3e1d1a6109e009f4590d6",
          scopes: ["**:**:**"],
        },
        {
          recordId: "1dfcc20d-ab1d-47a2-a171-180d957f2425",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdByCredentialId: null,
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
];
