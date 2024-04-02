import test from "ava";
import { URL, fileURLToPath } from "url";
import { setup } from "./setup.js";
import { basename } from "path";

let url: URL;
let teardown: () => Promise<void>;

// Load public and private keys from files.
import { readFileSync } from "fs";
const privateKey = readFileSync("private.pem", "utf8");
const publicKey = readFileSync("public.pem", "utf8");

// Setup.
test.before(async () => {
  const s = await setup(basename(fileURLToPath(import.meta.url), ".js"));
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
      authorization:
        "Basic YzcwZGE0OTgtMjdlZC00YzNiLWEzMTgtMzhiYjIyMGNlZjQ4OjhmNTczOTVlY2Q5ZDZmY2I4ODQxNDVmOGY2ZmVmZjM1N2ZlYWQyZmJkODM2MDdlODdkNzFhN2MzNzJjZjM3YWQ=",
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          keys

          viewer {
            id
            enabled
            grant {
              id
              enabled
              user {
                id
              }
              client {
                id
                enabled
                name
                description
                secrets
                urls
              }
              secrets
              codes
              scopes
              access
              authorizations {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  cursor
                  node {
                    id
                  }
                }
              }
            }
            user {
              id
              enabled
              type
              name
              authorizations {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  cursor
                  node {
                    id
                  }
                }
              }
              credentials {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  cursor
                  node {
                    id
                    enabled
                    user {
                      id
                    }
                    authority {
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
                    }

                    authority {
                      id
                      enabled
                      name
                      description
                    }

                    ... on EmailCredential {
                      email
                      authority {
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
                    }

                    ... on PasswordCredential {
                      authority {
                        rounds
                      }
                      hash
                    }
                  }
                }
              }
              grants {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  cursor
                  node {
                    id
                  }
                }
              }
              grant(clientId: "17436d83-6022-4101-bf9f-997f1550f57c") {
                id
              }
              roles {
                pageInfo {
                  startCursor
                  endCursor
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  cursor
                  node {
                    id
                    enabled
                    name
                    description
                    users {
                      pageInfo {
                        startCursor
                        endCursor
                        hasNextPage
                        hasPreviousPage
                      }
                      edges {
                        cursor
                        node {
                          id
                          enabled
                        }
                      }
                    }
                    scopes
                  }
                }
              }
            }
            secret
            scopes
          }

          authority(id: "0d765613-e813-40e5-9aa7-89f96531364e") {
            id
          }
          authorities(first: 1) {
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

          authorization(id: "5387ece5-37a1-4573-a189-14333ebf8d88") {
            id
          }
          authorizations(first: 1) {
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
          clients(first: 1) {
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
          credentials(first: 1) {
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
          grants(first: 1) {
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
          roles(first: 1) {
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
          users(first: 1) {
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
                access
              }
            }
          }
        }
      `,
    }),
  });

  const json = await result.json();

  t.deepEqual(
    {
      data: {
        keys: [
          "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC\n4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy\nUEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK\nBac/x5qiUn5fh2xM+wIDAQAB\n-----END PUBLIC KEY-----",
        ],
        viewer: {
          id: "c70da498-27ed-4c3b-a318-38bb220cef48",
          enabled: true,
          grant: {
            id: "e4670762-beb7-435c-94af-055b951f97e6",
            enabled: true,
            user: {
              id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
            },
            client: {
              id: "17436d83-6022-4101-bf9f-997f1550f57c",
              enabled: true,
              name: "Dunder Mifflin Inventory Portal",
              description:
                "All those problems will be a thing of the past in 2.0.",
              secrets: [
                "1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2",
              ],
              urls: [
                "https://www.dundermifflin.com",
                "https://admin.dundermifflin.com",
                "http://localhost",
              ],
            },
            secrets: [
              "ZTQ2NzA3NjItYmViNy00MzVjLTk0YWYtMDU1Yjk1MWY5N2U2OjE1NTM5MjUzNDA6ZDQ5NDJjZGFhYTY1ZTg4YmQ2MWQ1MDIyZjlmN2E0ZGU=",
            ],
            codes: [],
            scopes: ["**:**:**"],
            access: ["**:**:**"],
            authorizations: {
              pageInfo: {
                startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "c70da498-27ed-4c3b-a318-38bb220cef48",
                  },
                },
              ],
            },
          },
          user: {
            id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
            enabled: true,
            type: "HUMAN",
            name: "Michael Scott",
            authorizations: {
              pageInfo: {
                startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "c70da498-27ed-4c3b-a318-38bb220cef48",
                  },
                },
              ],
            },
            credentials: {
              pageInfo: {
                startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                endCursor: "YXJyYXljb25uZWN0aW9uOjE=",
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "540128ad-7a55-423e-a85c-103677df333c",
                    enabled: true,
                    user: {
                      id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                    },
                    authority: {
                      id: "0d765613-e813-40e5-9aa7-89f96531364e",
                      enabled: true,
                      name: "Email",
                      description: "The email authority.",
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
                    email: "michael.scott@dundermifflin.com",
                  },
                },
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjE=",
                  node: {
                    id: "c1a8cc41-66d5-4aef-8b97-e5f97d2bc699",
                    enabled: true,
                    user: {
                      id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                    },
                    authority: {
                      id: "725f9c3b-4a72-4021-9066-c89e534df5be",
                      enabled: true,
                      name: "Password",
                      description: "The password authority.",
                      rounds: 4,
                    },
                    hash: "$2a$04$j.W.ev.hBuIZZEKRZRpcPOmHz6SjaYtg/cO8vnBlq3lHHnFh2B1N2",
                  },
                },
              ],
            },
            grants: {
              pageInfo: {
                startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "e4670762-beb7-435c-94af-055b951f97e6",
                  },
                },
              ],
            },
            grant: {
              id: "e4670762-beb7-435c-94af-055b951f97e6",
            },
            roles: {
              pageInfo: {
                startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                endCursor: "YXJyYXljb25uZWN0aW9uOjE=",
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "e833c8b8-acf1-42a1-9809-2bedab7d58c7",
                    enabled: true,
                    name: "Basic User",
                    description:
                      "All human users should be assigned to this role.",
                    users: {
                      pageInfo: {
                        startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                        endCursor: "YXJyYXljb25uZWN0aW9uOjg=",
                        hasNextPage: false,
                        hasPreviousPage: false,
                      },
                      edges: [
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                          node: {
                            id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
                            enabled: true,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjE=",
                          node: {
                            id: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
                            enabled: true,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjI=",
                          node: {
                            id: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
                            enabled: true,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjM=",
                          node: {
                            id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
                            enabled: true,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjQ=",
                          node: {
                            id: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
                            enabled: false,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjU=",
                          node: {
                            id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                            enabled: true,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjY=",
                          node: {
                            id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
                            enabled: true,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjc=",
                          node: {
                            id: "dc396449-2c7d-4a23-a159-e6415ded71d2",
                            enabled: false,
                          },
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjg=",
                          node: {
                            id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
                            enabled: true,
                          },
                        },
                      ],
                    },
                    scopes: [
                      "authx:v2.authorization..*.*..*..{current_user_id}:*..*..",
                      "authx:v2.authorization..*.....{current_user_id}:*..*.*.",
                      "authx:v2.authorization..{current_authorization_id}.*..*..{current_user_id}:*..*.*.",
                      "authx:v2.client...*....:r....",
                      "authx:v2.grant...*..*..{current_user_id}:*..*.*.",
                      "authx:v2.user.......{current_user_id}:r..*..",
                    ],
                  },
                },
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjE=",
                  node: {
                    id: "ee37605c-5834-40c9-bd80-bac16d9e62a4",
                    enabled: true,
                    name: "Super Administrator",
                    description:
                      "A super administrator has full access to all resources.",
                    users: {
                      pageInfo: {
                        startCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                        endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                        hasNextPage: false,
                        hasPreviousPage: false,
                      },
                      edges: [
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                          node: {
                            id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                            enabled: true,
                          },
                        },
                      ],
                    },
                    scopes: ["**:**:**"],
                  },
                },
              ],
            },
          },
          secret:
            "8f57395ecd9d6fcb884145f8f6feff357fead2fbd83607e87d71a7c372cf37ad",
          scopes: ["**:**:**"],
        },
        authority: {
          id: "0d765613-e813-40e5-9aa7-89f96531364e",
        },
        authorities: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6MGQ3NjU2MTMtZTgxMy00MGU1LTlhYTctODlmOTY1MzEzNjRl",
            endCursor: "aWQ6MGQ3NjU2MTMtZTgxMy00MGU1LTlhYTctODlmOTY1MzEzNjRl",
          },
          edges: [
            {
              cursor: "aWQ6MGQ3NjU2MTMtZTgxMy00MGU1LTlhYTctODlmOTY1MzEzNjRl",
              node: {
                id: "0d765613-e813-40e5-9aa7-89f96531364e",
              },
            },
          ],
        },
        authorization: {
          id: "5387ece5-37a1-4573-a189-14333ebf8d88",
        },
        authorizations: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6NTM4N2VjZTUtMzdhMS00NTczLWExODktMTQzMzNlYmY4ZDg4",
            endCursor: "aWQ6NTM4N2VjZTUtMzdhMS00NTczLWExODktMTQzMzNlYmY4ZDg4",
          },
          edges: [
            {
              cursor: "aWQ6NTM4N2VjZTUtMzdhMS00NTczLWExODktMTQzMzNlYmY4ZDg4",
              node: {
                id: "5387ece5-37a1-4573-a189-14333ebf8d88",
              },
            },
          ],
        },
        client: {
          id: "1fcb730e-f134-463a-b224-cab7e61c5ce0",
        },
        clients: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6MTc0MzZkODMtNjAyMi00MTAxLWJmOWYtOTk3ZjE1NTBmNTdj",
            endCursor: "aWQ6MTc0MzZkODMtNjAyMi00MTAxLWJmOWYtOTk3ZjE1NTBmNTdj",
          },
          edges: [
            {
              cursor: "aWQ6MTc0MzZkODMtNjAyMi00MTAxLWJmOWYtOTk3ZjE1NTBmNTdj",
              node: {
                id: "17436d83-6022-4101-bf9f-997f1550f57c",
              },
            },
          ],
        },
        credential: {
          id: "540128ad-7a55-423e-a85c-103677df333c",
        },
        credentials: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6MDJlNTg4YjAtNjBhNy00YWY1LWEwYzctYjc4ZWQ0Mzk1N2I0",
            endCursor: "aWQ6MDJlNTg4YjAtNjBhNy00YWY1LWEwYzctYjc4ZWQ0Mzk1N2I0",
          },
          edges: [
            {
              cursor: "aWQ6MDJlNTg4YjAtNjBhNy00YWY1LWEwYzctYjc4ZWQ0Mzk1N2I0",
              node: {
                id: "02e588b0-60a7-4af5-a0c7-b78ed43957b4",
              },
            },
          ],
        },
        grant: {
          id: "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
        },
        grants: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6NGU3NmNiMTMtYWIyNC00ZGMxLWFkOTYtYWJjYmI4OWY1NTI5",
            endCursor: "aWQ6NGU3NmNiMTMtYWIyNC00ZGMxLWFkOTYtYWJjYmI4OWY1NTI5",
          },
          edges: [
            {
              cursor: "aWQ6NGU3NmNiMTMtYWIyNC00ZGMxLWFkOTYtYWJjYmI4OWY1NTI5",
              node: {
                id: "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
              },
            },
          ],
        },
        role: {
          id: "ee37605c-5834-40c9-bd80-bac16d9e62a4",
        },
        roles: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6MDhlMmIzOWUtYmE5Zi00ZGUyLThkY2EtYWVmNDYwNzkzNTY2",
            endCursor: "aWQ6MDhlMmIzOWUtYmE5Zi00ZGUyLThkY2EtYWVmNDYwNzkzNTY2",
          },
          edges: [
            {
              cursor: "aWQ6MDhlMmIzOWUtYmE5Zi00ZGUyLThkY2EtYWVmNDYwNzkzNTY2",
              node: {
                id: "08e2b39e-ba9f-4de2-8dca-aef460793566",
              },
            },
          ],
        },
        user: {
          id: "e165cbb0-86b0-4e11-9db7-eb5f742161b8",
        },
        users: {
          pageInfo: {
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
            endCursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
          },
          edges: [
            {
              cursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
              node: {
                id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
                access: [
                  "authx:v2.authorization..*.*..*..a6a0946d-eeb4-45cd-83c6-c7920f2272eb:*..*..",
                  "authx:v2.authorization..*.....a6a0946d-eeb4-45cd-83c6-c7920f2272eb:*..*.*.",
                  "authx:v2.authorization..c70da498-27ed-4c3b-a318-38bb220cef48.*..*..a6a0946d-eeb4-45cd-83c6-c7920f2272eb:*..*.*.",
                  "authx:v2.client...*....:r....",
                  "authx:v2.grant...*..*..a6a0946d-eeb4-45cd-83c6-c7920f2272eb:*..*.*.",
                  "authx:v2.user.......a6a0946d-eeb4-45cd-83c6-c7920f2272eb:r..*..",
                  "cms:promotions:**",
                  "inventory:order.*:**",
                ],
              },
            },
          ],
        },
      },
    },
    json,
  );
});

// Teardown.
test.after.always(async () => {
  if (teardown) {
    await teardown();
  }
});
