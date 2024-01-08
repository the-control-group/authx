import { ClientBase } from "pg";
import { Client } from "@authx/authx";

export const client = [
  {
    id: "1fcb730e-f134-463a-b224-cab7e61c5ce0",
    insert: (tx: ClientBase): Promise<Client> =>
      Client.write(
        tx,
        {
          id: "1fcb730e-f134-463a-b224-cab7e61c5ce0",
          enabled: false,
          name: "AuthX Bootstrap",
          description: "The bootstrap utility.",
          secrets: [
            "5dd7863c58cf508819946f68f0b77774605a834b5698ee3b30f2a73e4f40ea2a",
          ],
          urls: [],
        },
        {
          recordId: "cbed41a3-e43f-42d4-9800-415ff8fb8d23",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "702d2103-a1b3-4873-b36b-dc8823fe95d1",
    insert: (tx: ClientBase): Promise<Client> =>
      Client.write(
        tx,
        {
          id: "702d2103-a1b3-4873-b36b-dc8823fe95d1",
          enabled: true,
          name: "AuthX Management Dashboard",
          description: "The management UI.",
          secrets: [
            "aae04519edf709ec1652fa3a72ee190412ca1f6ce6d8bb53dfc52f7ea484a0c7",
          ],
          urls: [],
        },
        {
          recordId: "7a229ad6-66e6-45a7-a2d1-909c8612cea2",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "17436d83-6022-4101-bf9f-997f1550f57c",
    insert: (tx: ClientBase): Promise<Client> =>
      Client.write(
        tx,
        {
          id: "17436d83-6022-4101-bf9f-997f1550f57c",
          enabled: true,
          name: "Dunder Mifflin Inventory Portal",
          description: "All those problems will be a thing of the past in 2.0.",
          secrets: [
            "1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2",
          ],
          urls: [
            "https://www.dundermifflin.com",
            "https://admin.dundermifflin.com",
            "http://localhost",
          ],
        },
        {
          recordId: "c6104e78-dc43-4f19-adce-bec12e777b49",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
];
