import { Authority } from "../models";

export const authority = [
  {
    data: new Authority({
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
    }),
    metadata: {
      recordId: "84168393-0277-4ba2-b3bd-5ad837fe7cf5",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Authority({
      id: "725f9c3b-4a72-4021-9066-c89e534df5be",
      enabled: true,
      name: "Password",
      strategy: "password",
      details: {
        rounds: 4
      }
    }),
    metadata: {
      recordId: "dc4f3328-34da-4c46-94a8-2ec041d495e3",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Authority({
      id: "ba8104d1-0958-42f9-b66d-c878ee68495e",
      enabled: true,
      name: "Secret",
      strategy: "secret",
      details: {
        rounds: 4
      }
    }),
    metadata: {
      recordId: "c6484e5b-a6a9-457b-962d-4072efbd8a57",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  },
  {
    data: new Authority({
      id: "a6e2df15-ceea-48b2-be1c-7b37289ddce8",
      enabled: true,
      name: "Google",
      strategy: "google",
      details: {
        clientId:
          "210657947312-8s9g76sc7g1goes6tu2h4jmp3t41i8pb.apps.googleusercontent.com",
        clientSecret: "HxojpEHE44oY-SGzC_IIzhkW",
        emailAuthorityId: "email",
        emailDomains: null,
        roleIds: ["default"]
      }
    }),
    metadata: {
      recordId: "a783c026-0601-4af0-8e0e-ce4c36e053e9",
      createdBySessionId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
      createdAt: new Date("2019-03-06T21:07:59.814Z")
    }
  }
];
