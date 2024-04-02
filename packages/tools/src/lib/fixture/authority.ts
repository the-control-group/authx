import { ClientBase } from "pg";
import { EmailAuthority } from "@authx/strategy-email";
import { PasswordAuthority } from "@authx/strategy-password";

export const authorityIds = [
  "0d765613-e813-40e5-9aa7-89f96531364e",
  "725f9c3b-4a72-4021-9066-c89e534df5be",
];

export const authority: (
  privateKey: string,
  publicKey: string,
) => {
  id: string;
  insert: (tx: ClientBase) => Promise<EmailAuthority | PasswordAuthority>;
}[] = (privateKey: string, publicKey: string) => [
  {
    id: "0d765613-e813-40e5-9aa7-89f96531364e",
    insert: (tx: ClientBase): Promise<EmailAuthority> =>
      EmailAuthority.write(
        tx,
        {
          id: "0d765613-e813-40e5-9aa7-89f96531364e",
          enabled: true,
          name: "Email",
          description: "The email authority.",
          strategy: "email",
          details: {
            privateKey,
            publicKeys: [publicKey],
            proofValidityDuration: 3600,
            authenticationEmailSubject: "Reset your password",
            authenticationEmailText:
              "Please visit the following link to authenticate with this email address:\n\n{{{url}}}",
            authenticationEmailHtml:
              'Please <a href="{{url}}">follow this link</a> to authenticate with this email address.',
            verificationEmailSubject: "Verify your email",
            verificationEmailText:
              "Please visit the following link to prove your control of this email address:\n\n{{{url}}}",
            verificationEmailHtml:
              'Please <a href="{{url}}">follow this link</a> to prove your control of this email address.',
          },
        },
        {
          recordId: "84168393-0277-4ba2-b3bd-5ad837fe7cf5",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
  {
    id: "725f9c3b-4a72-4021-9066-c89e534df5be",
    insert: (tx: ClientBase): Promise<PasswordAuthority> =>
      PasswordAuthority.write(
        tx,
        {
          id: "725f9c3b-4a72-4021-9066-c89e534df5be",
          enabled: true,
          name: "Password",
          description: "The password authority.",
          strategy: "password",
          details: {
            rounds: 4,
          },
        },
        {
          recordId: "dc4f3328-34da-4c46-94a8-2ec041d495e3",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        },
      ),
  },
];
