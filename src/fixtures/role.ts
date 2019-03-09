import { Role } from "../models";

export const role = [
  {
    data: new Role({
      id: "ee37605c-5834-40c9-bd80-bac16d9e62a4",
      enabled: true,
      name: "AuthX Administrator",
      assignments: ["a6a0946d-eeb4-45cd-83c6-c7920f2272eb"],
      scopes: ["AuthX:**:**"]
    }),
    metadata: {
      recordId: "cde64a26-8371-498c-a613-018bf1393790",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Role({
      id: "e833c8b8-acf1-42a1-9809-2bedab7d58c7",
      enabled: true,
      name: "Default User",
      assignments: [
        "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
        "0cbd3783-0424-4f35-be51-b42f07a2a987",
        "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
        "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
        "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
        "dc396449-2c7d-4a23-a159-e6415ded71d2",
        "51192909-3664-44d5-be62-c6b45f0b0ee6",
        "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
        "1691f38d-92c8-4d86-9a89-da99528cfcb5"
      ],
      scopes: [
        "AuthX:me:read",
        "AuthX:me:update",
        "AuthX:credential.*.me:*",
        "AuthX:grant.*.me:*"
      ]
    }),
    metadata: {
      recordId: "3657a9b7-f617-446f-8003-a06631c79a88",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Role({
      id: "2ec2118e-9c49-474f-9f44-da35c4420ef6",
      enabled: true,
      name: "Sales Team",
      assignments: [
        "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
        "0cbd3783-0424-4f35-be51-b42f07a2a987",
        "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9"
      ],
      scopes: ["website:sales:**"]
    }),
    metadata: {
      recordId: "c7270f9c-51d7-4a23-8d55-d48779e56181",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Role({
      id: "e3e67ba0-626a-4fb6-ad86-6520d4acfaf6",
      enabled: true,
      name: "Warehouse Staff",
      assignments: [
        "51192909-3664-44d5-be62-c6b45f0b0ee6",
        "9ad4b34b-781d-44fe-ac39-9b7ac43dde21"
      ],
      scopes: ["website:shippments:**"]
    }),
    metadata: {
      recordId: "f53acc48-e95e-48fa-911e-59fd9f59e972",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Role({
      id: "08e2b39e-ba9f-4de2-8dca-aef460793566",
      enabled: true,
      name: "HR",
      assignments: ["306eabbb-cc2b-4f88-be19-4bb6ec98e5c3"],
      scopes: ["AuthX:user:**", "AuthX:credential.*.user:**"]
    }),
    metadata: {
      recordId: "f94c5316-ce81-46e6-932a-0ac2c8fc886b",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  }
];
