import test from "ava";
import fetch from "node-fetch";
import { URL } from "url";
import { setup } from "./setup";
import { basename } from "path";

let url: URL;
let teardown: () => Promise<void>;

// Setup.
test.before(async () => {
  const s = await setup(basename(__filename, ".js"));
  url = s.url;
  teardown = s.teardown;
});

test("Root query fields.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          authority(id: "0d765613-e813-40e5-9aa7-89f96531364e") {
            id
            enabled
            name
            description
          }
          authorities {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                enabled
                name
                description

                ... on EmailAuthority {
                  privateKey
                  publicKeys
                  proofValidityDuration
                  authenticationEmailSubject
                  authenticationEmailText
                  authenticationEmailHtml
                  verificationEmailSubject
                  verificationEmailText
                  verificationEmailHtml
                }

                ... on PasswordAuthority {
                  rounds
                }

                ... on OpenIdAuthority {
                  authUrl
                  tokenUrl
                  clientId
                  clientSecret
                  restrictsAccountsToHostedDomains
                  emailAuthority {
                    id
                  }
                  matchesUsersByEmail
                  createsUnmatchedUsers
                  assignsCreatedUsersToRoles {
                    id
                  }
                }
              }
            }
          }

          authorization(id: "5387ece5-37a1-4573-a189-14333ebf8d88") {
            id
          }
          authorizations {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
              }
            }
          }

          client(id: "1fcb730e-f134-463a-b224-cab7e61c5ce0") {
            id
          }
          clients {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
              }
            }
          }

          credential(id: "540128ad-7a55-423e-a85c-103677df333c") {
            id
          }
          credentials {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
              }
            }
          }

          grant(id: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922") {
            id
          }
          grants {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
              }
            }
          }

          role(id: "ee37605c-5834-40c9-bd80-bac16d9e62a4") {
            id
          }
          roles {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
              }
            }
          }

          user(id: "e165cbb0-86b0-4e11-9db7-eb5f742161b8") {
            id
          }
          users {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
              }
            }
          }

          viewer {
            id
          }

          keys
        }
      `,
    }),
  });

  const json = await result.json();

  t.deepEqual(
    {
      data: {
        authority: {
          id: "0d765613-e813-40e5-9aa7-89f96531364e",
          enabled: true,
          name: "Email",
          description: "The email authority.",
        },
        authorities: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "aWQ6MGQ3NjU2MTMtZTgxMy00MGU1LTlhYTctODlmOTY1MzEzNjRl",
            endCursor: "aWQ6NzI1ZjljM2ItNGE3Mi00MDIxLTkwNjYtYzg5ZTUzNGRmNWJl",
          },
          edges: [
            {
              cursor: "aWQ6MGQ3NjU2MTMtZTgxMy00MGU1LTlhYTctODlmOTY1MzEzNjRl",
              node: {
                id: "0d765613-e813-40e5-9aa7-89f96531364e",
                enabled: true,
                name: "Email",
                description: "The email authority.",
                privateKey: null,
                publicKeys: null,
                proofValidityDuration: null,
                authenticationEmailSubject: null,
                authenticationEmailText: null,
                authenticationEmailHtml: null,
                verificationEmailSubject: null,
                verificationEmailText: null,
                verificationEmailHtml: null,
              },
            },
            {
              cursor: "aWQ6NzI1ZjljM2ItNGE3Mi00MDIxLTkwNjYtYzg5ZTUzNGRmNWJl",
              node: {
                id: "725f9c3b-4a72-4021-9066-c89e534df5be",
                enabled: true,
                name: "Password",
                description: "The password authority.",
                rounds: null,
              },
            },
          ],
        },
        authorization: null,
        authorizations: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
        },
        client: null,
        clients: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
        },
        credential: null,
        credentials: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
        },
        grant: null,
        grants: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
        },
        role: null,
        roles: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
        },
        user: null,
        users: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          edges: [],
        },
        viewer: null,
        keys: [
          "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC\n4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy\nUEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK\nBac/x5qiUn5fh2xM+wIDAQAB\n-----END PUBLIC KEY-----",
        ],
      },
    },
    json
  );
});

// Teardown.
test.after.always(async () => {
  if (teardown) {
    await teardown();
  }
});
