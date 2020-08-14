import { ClientBase } from "pg";
import { Role } from "@authx/authx";
import { createV2AuthXScope } from "@authx/authx/scopes";

export const role = [
  {
    id: "ee37605c-5834-40c9-bd80-bac16d9e62a4",
    insert: (tx: ClientBase): Promise<Role> =>
      Role.write(
        tx,
        {
          id: "ee37605c-5834-40c9-bd80-bac16d9e62a4",
          enabled: true,
          name: "Super Administrator",
          description:
            "A super administrator has full access to all resources.",
          userIds: ["a6a0946d-eeb4-45cd-83c6-c7920f2272eb"],
          scopes: ["**:**:**"]
        },
        {
          recordId: "cde64a26-8371-498c-a613-018bf1393790",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "e833c8b8-acf1-42a1-9809-2bedab7d58c7",
    insert: (tx: ClientBase): Promise<Role> =>
      Role.write(
        tx,
        {
          id: "e833c8b8-acf1-42a1-9809-2bedab7d58c7",
          enabled: true,
          name: "Basic User",
          description: "All human users should be assigned to this role.",
          userIds: [
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
            // A user can read basic fields of all clients.
            createV2AuthXScope(
              "authx",
              {
                type: "client",
                clientId: "*"
              },
              {
                basic: "r",
                secrets: ""
              }
            ),

            // A user can read basic fields of her own user account.
            createV2AuthXScope(
              "authx",
              {
                type: "user",
                userId: "{current_user_id}"
              },
              {
                basic: "r"
              }
            ),

            // A user can create, read and write all fields of new and existing
            // grants belonging to her.
            createV2AuthXScope(
              "authx",
              {
                type: "grant",
                clientId: "*",
                grantId: "*",
                userId: "{current_user_id}"
              },
              {
                basic: "*",
                scopes: "*",
                secrets: "*"
              }
            ),

            // A user can read the scopes and basic fields of all authorizations
            // beloning to her, and can also disable them.
            createV2AuthXScope(
              "authx",
              {
                type: "authorization",
                authorizationId: "*",
                clientId: "*",
                grantId: "*",
                userId: "{current_user_id}"
              },
              {
                basic: "*",
                scopes: "*",
                secrets: ""
              }
            ),

            // A user can read all fields of the current authorization, and can
            // also disable it.
            createV2AuthXScope(
              "authx",
              {
                type: "authorization",
                authorizationId: "{current_authorization_id}",
                clientId: "*",
                grantId: "*",
                userId: "{current_user_id}"
              },
              {
                basic: "*",
                scopes: "*",
                secrets: "*"
              }
            ),

            // A user can create, read and write all fields of new and existing
            // authorizations that are not associated with a grant.
            createV2AuthXScope(
              "authx",
              {
                type: "authorization",
                authorizationId: "*",
                clientId: "",
                grantId: "",
                userId: "{current_user_id}"
              },
              {
                basic: "*",
                scopes: "*",
                secrets: "*"
              }
            )
          ]
        },
        {
          recordId: "3657a9b7-f617-446f-8003-a06631c79a88",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "2ec2118e-9c49-474f-9f44-da35c4420ef6",
    insert: (tx: ClientBase): Promise<Role> =>
      Role.write(
        tx,
        {
          id: "2ec2118e-9c49-474f-9f44-da35c4420ef6",
          enabled: true,
          name: "Sales Team",
          description: "The people who sit upstairs.",
          userIds: [
            "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
            "0cbd3783-0424-4f35-be51-b42f07a2a987",
            "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9"
          ],
          scopes: ["cms:promotions:**", "inventory:order.*:**"]
        },
        {
          recordId: "c7270f9c-51d7-4a23-8d55-d48779e56181",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "e3e67ba0-626a-4fb6-ad86-6520d4acfaf6",
    insert: (tx: ClientBase): Promise<Role> =>
      Role.write(
        tx,
        {
          id: "e3e67ba0-626a-4fb6-ad86-6520d4acfaf6",
          enabled: true,
          name: "Warehouse Staff",
          description: "The people who work downstairs.",
          userIds: [
            "51192909-3664-44d5-be62-c6b45f0b0ee6",
            "9ad4b34b-781d-44fe-ac39-9b7ac43dde21"
          ],
          scopes: ["inventory:fulfilment.*:**"]
        },
        {
          recordId: "f53acc48-e95e-48fa-911e-59fd9f59e972",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "08e2b39e-ba9f-4de2-8dca-aef460793566",
    insert: (tx: ClientBase): Promise<Role> =>
      Role.write(
        tx,
        {
          id: "08e2b39e-ba9f-4de2-8dca-aef460793566",
          enabled: true,
          name: "HR",
          description: "The best; the worst.",
          userIds: ["306eabbb-cc2b-4f88-be19-4bb6ec98e5c3"],
          scopes: ["authx:v2.user.......*:r...."]
        },
        {
          recordId: "f94c5316-ce81-46e6-932a-0ac2c8fc886b",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  }
];
