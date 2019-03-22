import { PoolClient } from "pg";
import { Grant } from "../model";

export const grant = [
  {
    id: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
    insert: (tx: PoolClient) =>
      Grant.write(
        tx,
        {
          id: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
          enabled: true,
          clientId: "1fcb730e-f134-463a-b224-cab7e61c5ce0",
          userId: "e165cbb0-86b0-4e11-9db7-eb5f742161b8",
          secret: "383e0e7248492fc42db4791ab7927734",
          nonces: [],
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
    id: "e4670762-beb7-435c-94af-055b951f97e6",
    insert: (tx: PoolClient) =>
      Grant.write(
        tx,
        {
          id: "e4670762-beb7-435c-94af-055b951f97e6",
          enabled: true,
          clientId: "17436d83-6022-4101-bf9f-997f1550f57c",
          userId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          secret: "7dfcbf758d2740e01d1b9000b821e1aa",
          nonces: [],
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
    id: "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
    insert: (tx: PoolClient) =>
      Grant.write(
        tx,
        {
          id: "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
          enabled: true,
          clientId: "17436d83-6022-4101-bf9f-997f1550f57c",
          userId: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          secret: "b5bc36346e93ebb362bbdfa32936bc9e",
          nonces: [
            "NGU3NmNiMTMtYWIyNC00ZGMxLWFkOTYtYWJjYmI4OWY1NTI5OjE1NTE5MDY0Nzk4MTQ6MmQyMzc1ZmRjMTA0NjM0YjU3OGI5YWUxZDUxNGJiM2Y="
          ],
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
