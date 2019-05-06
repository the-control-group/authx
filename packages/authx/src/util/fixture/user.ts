import { PoolClient } from "pg";
import { User } from "../../model";

export const user = [
  {
    id: "e165cbb0-86b0-4e11-9db7-eb5f742161b8",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "e165cbb0-86b0-4e11-9db7-eb5f742161b8",
          enabled: false,
          type: "bot",
          name: "AuthX System"
        },
        {
          recordId: "eb54b852-223c-443a-8815-69b9aef362d7",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          enabled: true,
          type: "human",
          name: "Michael Scott"
        },
        {
          recordId: "a4937a65-a294-446d-8921-5adf8b900871",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
          enabled: true,
          type: "human",
          name: "Dwight Schrute"
        },
        {
          recordId: "5e42d178-be78-49c6-8879-9d3876b8e2fb",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
          enabled: true,
          type: "human",
          name: "Jim Halpert"
        },
        {
          recordId: "e1d4f3fd-451a-4610-a580-2cfc55d30796",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
          enabled: true,
          type: "human",
          name: "Pam Beesly-Halpert"
        },
        {
          recordId: "60cd702f-8cb5-4aa2-aae6-7fd9778f8d50",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
          enabled: true,
          type: "human",
          name: "Toby Flenderson"
        },
        {
          recordId: "242c13e0-5ce1-44f4-8bec-0eeeac9fc793",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "dc396449-2c7d-4a23-a159-e6415ded71d2",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "dc396449-2c7d-4a23-a159-e6415ded71d2",
          enabled: false,
          type: "human",
          name: "Jan Levinson"
        },
        {
          recordId: "3623d3aa-679a-4317-93c5-ac83555a1157",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          enabled: true,
          type: "human",
          name: "Darryl Philbin"
        },
        {
          recordId: "394d1984-ce27-43ba-8a2a-6a03a2ff8490",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
          enabled: false,
          type: "human",
          name: "Roy Anderson"
        },
        {
          recordId: "c44fffb4-101d-4826-932a-c45ddfb7c349",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
    insert: (tx: PoolClient) =>
      User.write(
        tx,
        {
          id: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
          enabled: true,
          type: "bot",
          name: "Dunder Mifflin Infinity"
        },
        {
          recordId: "0e029079-a84e-4b5f-92ee-1e81c4cebc13",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  }
];
