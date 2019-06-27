import test from "ava";
import { parse, execute } from "graphql";
import { Pool, Client } from "pg";
import * as tools from "@authx/tools";
import { createSchema, StrategyCollection, Authorization } from "@authx/authx";
import email from "@authx/strategy-email";
import password from "@authx/strategy-password";

let database: string;
let pool: Pool;

const baseContext = {
  realm: "authx",
  base: "http://localhost/",
  codeValidityDuration: 60,
  jwtValidityDuration: 5 * 60,
  privateKey:
    process.env.KEYPRIVATE ||
    `-----BEGIN RSA PRIVATE KEY-----
  MIICXAIBAAKBgQCfb+nyTPFCntEXbrFPU5DeE0gC4jXRcSFWDfCRgeqeQWqIW9De
  MmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/JyUEVIBMF0upDJMA53AFFx+0Fb
  /i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gKBac/x5qiUn5fh2xM+wIDAQAB
  AoGAeOPGo24r0LPTHs1TrC5Uvc4o3+bdn70D5dgT/IBhgTVgrZvQt2nDVPfgc2aw
  e1HzVnnbYteoC3xrea4R4lnzGpgcvLYyJ+LEAeRNT66u12EHnCjl8OM5Ods79RO2
  pSaGBiAlntq9E86DBJ9ma9lL9NXiokCx4h1ph9rqr6T+DMECQQD7zM56evJj8JyV
  kyu7m3PGpepqgMtO4LjHlkU9ZP2HRfrq+bl4yWps1TyCTPzaRujXW+hHJBPsTYar
  TmsLcDepAkEAohi3FmYiAMhppgPMFqIr15tY04dKDw4kPgbaQLXT59v9e16alj+2
  hsBvMWA/juLuk/2JRuNutY0WBmtkkS42AwJBAKEjS++txniWfl5qNE53CPxTKVTG
  31S3EwkG7YCApI5xBkZhUYQuwWCshXCNfDLjthY7xsXgHK/YXRo7sN09DyECQD2W
  0HIFSmQrweCfTrtG0Qux7dUpcV05DVI3/lNaAvL05mIqtufhu3OFyHnlTSD4XpgC
  XFd/8L+wpK65vVNgUIsCQFO6/fma+fjXx9kG+/zy4C/VwJWFUcpo5Z3R2TF7FheW
  5N6OERXoA+Qu+ew7xS6WrAp33dHncIyr9ekkvGc01FU=
  -----END RSA PRIVATE KEY-----`,
  publicKeys: [
    process.env.KEYPUBLIC ||
      `-----BEGIN PUBLIC KEY-----
  MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC
  4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy
  UEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK
  Bac/x5qiUn5fh2xM+wIDAQAB
  -----END PUBLIC KEY-----`,
    ...(process.env.KEYPUBLIC2 ? [process.env.KEYPUBLIC2] : [])
  ],
  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }): Promise<void> {
    console.log("--- SENDING EMAIL MESSAGE -------------------------");
    console.log(options);
  },
  strategies: new StrategyCollection([email, password])
};

const schema = createSchema(baseContext.strategies);

test.before(async () => {
  // Create the test database.
  database = `authx-test-${Buffer.from(__dirname).toString("hex")}`;
  let client = new Client();
  await client.connect();
  await client.query(`CREATE DATABASE "${database}";`);
  await client.end();
  pool = new Pool({ database });

  // Add fixtures to the database.
  const tx = await pool.connect();
  try {
    await tools.schema(tx);
    await tools.fixture(tx);
  } finally {
    tx.release();
  }
});

test("Deep query on viewer.", async t => {
  const tx = await pool.connect();
  let authorization;
  try {
    authorization = await Authorization.read(
      tx,
      "c70da498-27ed-4c3b-a318-38bb220cef48"
    );
  } finally {
    tx.release();
  }
  t.deepEqual(
    {
      data: {
        viewer: {
          id: "c70da498-27ed-4c3b-a318-38bb220cef48",
          enabled: true,
          grant: {
            id: "e4670762-beb7-435c-94af-055b951f97e6",
            enabled: true,
            user: {
              id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb"
            },
            client: {
              id: "17436d83-6022-4101-bf9f-997f1550f57c",
              enabled: true,
              name: "Dunder Mifflin Inventory Portal",
              description:
                "All those problems will be a thing of the past in 2.0.",
              secrets: [
                "1f1bb71ebe4341418dbeab6e8e693ec27336425fb2c021219305593ad12043a2"
              ],
              urls: [
                "https://www.dundermifflin.com",
                "https://admin.dundermifflin.com"
              ],
              users: {
                edges: [
                  {
                    cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                    node: {
                      id: "51192909-3664-44d5-be62-c6b45f0b0ee6"
                    }
                  }
                ],
                pageInfo: {
                  endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: "YXJyYXljb25uZWN0aW9uOjA="
                }
              }
            },
            secrets: [
              "ZTQ2NzA3NjItYmViNy00MzVjLTk0YWYtMDU1Yjk1MWY5N2U2OjE1NTM5MjUzNDA6ZDQ5NDJjZGFhYTY1ZTg4YmQ2MWQ1MDIyZjlmN2E0ZGU="
            ],
            codes: [],
            scopes: ["**:**:**"],
            authorizations: {
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "c70da498-27ed-4c3b-a318-38bb220cef48"
                  }
                }
              ],
              pageInfo: {
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: "YXJyYXljb25uZWN0aW9uOjA="
              }
            }
          },
          user: {
            id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
            enabled: true,
            type: "HUMAN",
            name: "Michael Scott",
            authorizations: {
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "c70da498-27ed-4c3b-a318-38bb220cef48"
                  }
                }
              ],
              pageInfo: {
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: "YXJyYXljb25uZWN0aW9uOjA="
              }
            },
            credentials: {
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "540128ad-7a55-423e-a85c-103677df333c",
                    enabled: true,
                    user: {
                      id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb"
                    },
                    authority: {
                      id: "0d765613-e813-40e5-9aa7-89f96531364e",
                      enabled: true,
                      name: "Email",
                      description: "The email authority",
                      privateKey:
                        "-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQCfb+nyTPFCntEXbrFPU5DeE0gC4jXRcSFWDfCRgeqeQWqIW9De\nMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/JyUEVIBMF0upDJMA53AFFx+0Fb\n/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gKBac/x5qiUn5fh2xM+wIDAQAB\nAoGAeOPGo24r0LPTHs1TrC5Uvc4o3+bdn70D5dgT/IBhgTVgrZvQt2nDVPfgc2aw\ne1HzVnnbYteoC3xrea4R4lnzGpgcvLYyJ+LEAeRNT66u12EHnCjl8OM5Ods79RO2\npSaGBiAlntq9E86DBJ9ma9lL9NXiokCx4h1ph9rqr6T+DMECQQD7zM56evJj8JyV\nkyu7m3PGpepqgMtO4LjHlkU9ZP2HRfrq+bl4yWps1TyCTPzaRujXW+hHJBPsTYar\nTmsLcDepAkEAohi3FmYiAMhppgPMFqIr15tY04dKDw4kPgbaQLXT59v9e16alj+2\nhsBvMWA/juLuk/2JRuNutY0WBmtkkS42AwJBAKEjS++txniWfl5qNE53CPxTKVTG\n31S3EwkG7YCApI5xBkZhUYQuwWCshXCNfDLjthY7xsXgHK/YXRo7sN09DyECQD2W\n0HIFSmQrweCfTrtG0Qux7dUpcV05DVI3/lNaAvL05mIqtufhu3OFyHnlTSD4XpgC\nXFd/8L+wpK65vVNgUIsCQFO6/fma+fjXx9kG+/zy4C/VwJWFUcpo5Z3R2TF7FheW\n5N6OERXoA+Qu+ew7xS6WrAp33dHncIyr9ekkvGc01FU=\n-----END RSA PRIVATE KEY-----",
                      publicKeys: [
                        "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC\n4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy\nUEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK\nBac/x5qiUn5fh2xM+wIDAQAB\n-----END PUBLIC KEY-----"
                      ],
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
                        'Please <a href="{{url}}">follow this link</a> to prove your control of this email address.'
                    },
                    email: "michael.scott@dundermifflin.com"
                  }
                },
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjE=",
                  node: {
                    id: "c1a8cc41-66d5-4aef-8b97-e5f97d2bc699",
                    enabled: true,
                    user: {
                      id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb"
                    },
                    authority: {
                      id: "725f9c3b-4a72-4021-9066-c89e534df5be",
                      enabled: true,
                      name: "Password",
                      description: "The password authority.",
                      rounds: 4
                    },
                    hash:
                      "$2a$04$j.W.ev.hBuIZZEKRZRpcPOmHz6SjaYtg/cO8vnBlq3lHHnFh2B1N2"
                  }
                }
              ],
              pageInfo: {
                endCursor: "YXJyYXljb25uZWN0aW9uOjE=",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: "YXJyYXljb25uZWN0aW9uOjA="
              }
            },
            grants: {
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "e4670762-beb7-435c-94af-055b951f97e6"
                  }
                }
              ],
              pageInfo: {
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: "YXJyYXljb25uZWN0aW9uOjA="
              }
            },
            grant: {
              id: "e4670762-beb7-435c-94af-055b951f97e6"
            },
            roles: {
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "e833c8b8-acf1-42a1-9809-2bedab7d58c7",
                    enabled: true,
                    name: "Default User",
                    description:
                      "This role provides the basic abilities needed for a human user.",
                    users: {
                      edges: [
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                          node: {
                            id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
                            enabled: true
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjE=",
                          node: {
                            id: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
                            enabled: true
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjI=",
                          node: {
                            id: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
                            enabled: true
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjM=",
                          node: {
                            id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
                            enabled: true
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjQ=",
                          node: {
                            id: "9ad4b34b-781d-44fe-ac39-9b7ac43dde21",
                            enabled: false
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjU=",
                          node: {
                            id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                            enabled: true
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjY=",
                          node: {
                            id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
                            enabled: true
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjc=",
                          node: {
                            id: "dc396449-2c7d-4a23-a159-e6415ded71d2",
                            enabled: false
                          }
                        },
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjg=",
                          node: {
                            id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
                            enabled: true
                          }
                        }
                      ],
                      pageInfo: {
                        endCursor: "YXJyYXljb25uZWN0aW9uOjg=",
                        hasNextPage: false,
                        hasPreviousPage: false,
                        startCursor: "YXJyYXljb25uZWN0aW9uOjA="
                      }
                    },
                    scopes: [
                      "authx:authorization.equal.self.*:**",
                      "authx:grant.equal.self.*:**",
                      "authx:user.equal.self:**"
                    ]
                  }
                },
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjE=",
                  node: {
                    id: "ee37605c-5834-40c9-bd80-bac16d9e62a4",
                    enabled: true,
                    name: "AuthX Administrator",
                    description: "This role provides full access to authx.",
                    users: {
                      edges: [
                        {
                          cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                          node: {
                            id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                            enabled: true
                          }
                        }
                      ],
                      pageInfo: {
                        endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                        hasNextPage: false,
                        hasPreviousPage: false,
                        startCursor: "YXJyYXljb25uZWN0aW9uOjA="
                      }
                    },
                    scopes: ["authx:**:**"]
                  }
                }
              ],
              pageInfo: {
                endCursor: "YXJyYXljb25uZWN0aW9uOjE=",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: "YXJyYXljb25uZWN0aW9uOjA="
              }
            },
            clients: {
              edges: [
                {
                  cursor: "YXJyYXljb25uZWN0aW9uOjA=",
                  node: {
                    id: "702d2103-a1b3-4873-b36b-dc8823fe95d1"
                  }
                }
              ],
              pageInfo: {
                endCursor: "YXJyYXljb25uZWN0aW9uOjA=",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: "YXJyYXljb25uZWN0aW9uOjA="
              }
            }
          },
          secret:
            "8f57395ecd9d6fcb884145f8f6feff357fead2fbd83607e87d71a7c372cf37ad",
          scopes: ["**:**:**"]
        }
      }
    },
    await execute({
      schema,
      contextValue: {
        ...baseContext,
        pool,
        authorization
      },
      document: parse(/* GraphQL */ `
        query {
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
                    }
                  }
                }
              }
              secrets
              codes
              scopes
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
              clients {
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
            secret
            scopes
          }
        }
      `)
    })
  );
});

// Drop the test database.
test.after.always(async () => {
  if (database && pool) {
    await pool.end();

    let client = new Client();
    await client.connect();
    await client.query(`DROP DATABASE "${database}";`);
    await client.end();
  }
});
