import { ClientBase } from "pg";
import { EmailCredential } from "@authx/strategy-email";
import { PasswordCredential } from "@authx/strategy-password";

export const credential: {
  id: string;
  insert: (tx: ClientBase) => Promise<EmailCredential | PasswordCredential>;
}[] = [
  {
    id: "540128ad-7a55-423e-a85c-103677df333c",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "540128ad-7a55-423e-a85c-103677df333c",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "michael.scott@dundermifflin.com",
          userId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          details: {},
        },
        {
          recordId: "43f7df35-4c00-4baf-b175-1914869897d5",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "d92a642f-70ca-465c-9130-c25fdad16a6d",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "d92a642f-70ca-465c-9130-c25fdad16a6d",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "dwight.schrute@dundermifflin.com",
          userId: "0cbd3783-0424-4f35-be51-b42f07a2a987",
          details: {},
        },
        {
          recordId: "a773bff0-ada1-43b9-b724-85b85dfcd2e3",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "42b27b88-672c-4649-9afa-77e114e6ad98",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "42b27b88-672c-4649-9afa-77e114e6ad98",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "jim.halpert@dundermifflin.com",
          userId: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
          details: {},
        },
        {
          recordId: "d6e44a92-8841-48f1-8d9b-0f1d54ee1262",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "2caedd2e-fff6-4df9-952e-34d807f21cab",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "2caedd2e-fff6-4df9-952e-34d807f21cab",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "pam.beesly-halpert@dundermifflin.com",
          userId: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
          details: {},
        },
        {
          recordId: "80a5449b-c08e-4ee5-8f4f-bd6f16b716af",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "02e588b0-60a7-4af5-a0c7-b78ed43957b4",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "02e588b0-60a7-4af5-a0c7-b78ed43957b4",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "toby.flenderson@dundermifflin.com",
          userId: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
          details: {},
        },
        {
          recordId: "4c33b324-6b53-4163-8e25-d3ebaa863913",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "d08302e7-6b48-4eb9-83a3-4f49ef4b6647",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "d08302e7-6b48-4eb9-83a3-4f49ef4b6647",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "jan.levinson@dundermifflin.com",
          userId: "dc396449-2c7d-4a23-a159-e6415ded71d2",
          details: {},
        },
        {
          recordId: "f3601f1e-2af0-4454-b30c-4658746d1be4",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "74501d3e-b319-4c84-b5a6-4135fc595fb1",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "74501d3e-b319-4c84-b5a6-4135fc595fb1",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "darryl.philbin@dundermifflin.com",
          userId: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          details: {},
        },
        {
          recordId: "8579853d-db37-4212-8cac-3fe42f1e8c42",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "fee2e658-ddca-46d8-a75c-114b36325e35",
    insert: (tx: ClientBase): Promise<EmailCredential> =>
      EmailCredential.write(
        tx,
        {
          id: "fee2e658-ddca-46d8-a75c-114b36325e35",
          enabled: true,
          authorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
          authorityUserId: "roy.anderson@dundermifflin.com",
          userId: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
          details: {},
        },
        {
          recordId: "af713259-e3a6-4a66-96a7-284cb3bac2cb",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "c1a8cc41-66d5-4aef-8b97-e5f97d2bc699",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "c1a8cc41-66d5-4aef-8b97-e5f97d2bc699",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          userId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          details: {
            hash: "$2a$04$j.W.ev.hBuIZZEKRZRpcPOmHz6SjaYtg/cO8vnBlq3lHHnFh2B1N2", // password: 123456
          },
        },
        {
          recordId: "f160eda8-aa01-4fd3-b66c-8a06352e3dd1",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "f1937f99-4c17-4b10-a745-345288727c1a",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "f1937f99-4c17-4b10-a745-345288727c1a",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "0cbd3783-0424-4f35-be51-b42f07a2a987",
          userId: "0cbd3783-0424-4f35-be51-b42f07a2a987",
          details: {
            hash: "$2a$04$VAAR33JYHsDALax5e0DO2eVkqitvn5UZOL0awZk90e7CwoxJvbrOW", // password: beets are awesome
          },
        },
        {
          recordId: "5a389b50-c2df-4361-a1de-235a3505f43c",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "8d5d1c50-cba2-4afe-83fa-3b8d784b607c",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "8d5d1c50-cba2-4afe-83fa-3b8d784b607c",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
          userId: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
          details: {
            hash: "$2a$04$9AqH/83kt7Tid5n01ysLBOs2u23S/2PUWXKf9vOzOUzyk6.kwT4R2", // password: baseball
          },
        },
        {
          recordId: "3f589ed1-5e09-4e74-919d-318bb7935fcd",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "6b33db96-05e5-4ade-8ac7-2959b96ce7db",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "6b33db96-05e5-4ade-8ac7-2959b96ce7db",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
          userId: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
          details: {
            hash: "$2a$04$EnRptYjQNyS5zo16RyuOie5QJGAuq492YhQVzoWZe96y9LYjJEU8K", // password: i love jim
          },
        },
        {
          recordId: "f2971365-2428-455c-984d-e454fc89d6b3",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "03e69b4c-3f73-4b15-866c-17efeeed1678",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "03e69b4c-3f73-4b15-866c-17efeeed1678",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
          userId: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
          details: {
            hash: "$2a$04$bEApeUnCL0pMAZf6fNym9OO/z6SJsyN6CY773Fx1O7ZTSzgwu1pXG", // password: costa rica
          },
        },
        {
          recordId: "5cb8a994-5c76-4551-891e-f9720a4be423",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "a941a36d-a3d3-4c8b-a03a-f549dac3871e",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "a941a36d-a3d3-4c8b-a03a-f549dac3871e",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "dc396449-2c7d-4a23-a159-e6415ded71d2",
          userId: "dc396449-2c7d-4a23-a159-e6415ded71d2",
          details: {
            hash: "$2a$04$GM8OJ7/Oq4H2Q.d9Yk3Ga.ffKmrUez7EYTHmEoX7jHpkDmmepl1/W", // password: you can get through today
          },
        },
        {
          recordId: "d9d6e7dc-640e-492a-9f87-1bd80be2fe6d",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "2e933e24-072f-41dd-b5f2-75d27f11a8b4",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "2e933e24-072f-41dd-b5f2-75d27f11a8b4",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          userId: "51192909-3664-44d5-be62-c6b45f0b0ee6",
          details: {
            hash: "$2a$04$cVcd/QO4.LxGRTi7g4iON.HAiFsmuKBqcIp9WvTTTWTBhbnjHMRbe", // password: whatever
          },
        },
        {
          recordId: "c0692098-9909-4771-a79d-3702814c9f92",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "0bae2fed-26ac-4fa2-8879-a226c9fb859a",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "0bae2fed-26ac-4fa2-8879-a226c9fb859a",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
          userId: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
          details: {
            hash: "$2a$04$R/nz0oaq8l4Ba0CNznZ3v.P2CRZEN/z4jN/2s1VFMPFVTQ9qQL/WO", // password: art sucks
          },
        },
        {
          recordId: "a7a9153b-48f7-4082-9abc-ae90e5719fde",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "e1381b64-b0df-4e81-9b31-38ae2f1325fc",
    insert: (tx: ClientBase): Promise<PasswordCredential> =>
      PasswordCredential.write(
        tx,
        {
          id: "e1381b64-b0df-4e81-9b31-38ae2f1325fc",
          enabled: true,
          authorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
          authorityUserId: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
          userId: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
          details: {
            hash: "$2a$04$SPRITTeZvQ9hI.TPkvoE0Op19wAgBlObKRQ6sz.ahjVVDFBajjFrO", // password: da8ad1c19e0f
          },
        },
        {
          recordId: "de790793-ac98-43b7-8ac6-1ddcf0cd5898",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
];
