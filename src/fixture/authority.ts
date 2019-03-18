import { PoolClient } from "pg";
import { EmailAuthority } from "../strategy/email";
import { PasswordAuthority } from "../strategy/password";

export const authorityIds = [
  "0d765613-e813-40e5-9aa7-89f96531364e",
  "725f9c3b-4a72-4021-9066-c89e534df5be"
];

export const authority: {
  id: string;
  insert: (tx: PoolClient) => Promise<EmailAuthority | PasswordAuthority>;
}[] = [
  {
    id: "0d765613-e813-40e5-9aa7-89f96531364e",
    insert: (tx: PoolClient) =>
      EmailAuthority.write(
        tx,
        {
          id: "0d765613-e813-40e5-9aa7-89f96531364e",
          enabled: true,
          name: "Email",
          strategy: "email",
          details: {
            expiresIn: 3600,
            authenticationEmailSubject: "Reset your password",
            authenticationEmailText: "{{{token}}}",
            authenticationEmailHtml: '<a href="{{url}}">reset</a>',
            verificationEmailSubject: "Verify your email",
            verificationEmailText: "{{{token}}}",
            verificationEmailHtml: '<a href="{{url}}">verify</a>',
            mailer: {
              transport: null,
              auth: {},
              defaults: {}
            }
          }
        },
        {
          recordId: "84168393-0277-4ba2-b3bd-5ad837fe7cf5",
          createdByTokenId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  },
  {
    id: "725f9c3b-4a72-4021-9066-c89e534df5be",
    insert: (tx: PoolClient) =>
      PasswordAuthority.write(
        tx,
        {
          id: "725f9c3b-4a72-4021-9066-c89e534df5be",
          enabled: true,
          name: "Password",
          strategy: "password",
          details: {
            rounds: 4
          }
        },
        {
          recordId: "dc4f3328-34da-4c46-94a8-2ec041d495e3",
          createdByTokenId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z")
        }
      )
  }
];
