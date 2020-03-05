import React, {
  Fragment,
  ReactElement,
  useEffect,
  useContext,
  useCallback,
  useState,
  ReactChild,
  useMemo
} from "react";

import {
  GraphQL,
  useGraphQL,
  GraphQLFetchOptionsOverride,
  GraphQLContext
} from "graphql-react";

import { createV2AuthXScope } from "@authx/authx/scopes";

import { isSuperset, getDifference, simplify, inject } from "@authx/scopes";
import { match } from "@authx/authx/dist/util/explanations";

import { v4 } from "uuid";

declare const __REALM__: string;

const implicitScopes = [
  createV2AuthXScope(
    __REALM__,
    {
      type: "user",
      userId: "{current_user_id}"
    },
    {
      basic: "r"
    }
  ),
  createV2AuthXScope(
    __REALM__,
    {
      type: "grant",
      clientId: "{current_client_id}",
      grantId: "{current_grant_id}",
      userId: "{current_user_id}"
    },
    {
      basic: "r",
      scopes: "*",
      secrets: "*"
    }
  ),
  createV2AuthXScope(
    __REALM__,
    {
      type: "grant",
      clientId: "{current_client_id}",
      grantId: "{current_grant_id}",
      userId: "{current_user_id}"
    },
    {
      basic: "w",
      scopes: "",
      secrets: "*"
    }
  ),
  createV2AuthXScope(
    __REALM__,
    {
      type: "authorization",
      authorizationId: "*",
      clientId: "{current_client_id}",
      grantId: "{current_grant_id}",
      userId: "{current_user_id}"
    },
    {
      basic: "*",
      scopes: "*",
      secrets: "*"
    }
  )
];

function Scope({ children }: { children: ReactChild }): ReactElement {
  return (
    <div
      style={{
        width: "0",
        minWidth: "100%",
        boxSizing: "border-box",
        position: "relative",
        margin: "0",
        padding: "0",
        borderRadius: "7px",
        overflow: "hidden"
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          bottom: "0",
          width: "14px",
          background:
            "linear-gradient(-90deg, rgba(22,23,23,0) 0%, rgba(22,23,23,1) 75%)"
        }}
      />
      <pre
        style={{
          margin: "0",
          overflow: "auto",
          background: "hsl(180, 2%, 9%)",
          padding: "14px 14px"
        }}
      >
        {children}
      </pre>
      <span
        style={{
          position: "absolute",
          top: "0",
          right: "0",
          bottom: "0",
          width: "14px",
          background:
            "linear-gradient(90deg, rgba(22,23,23,0) 0%, rgba(22,23,23,1) 75%)"
        }}
      />
    </div>
  );
}

function Checkbox({
  value,
  onChange
}: {
  value: boolean;
  onChange: (checked: boolean) => void;
}): ReactElement {
  const [hasFocus, setHasFocus] = useState<boolean>(false);
  return (
    <div
      style={{
        background: value ? "hsl(120, 43%, 50%)" : "hsl(0, 43%, 50%)",
        borderRadius: "11px",
        boxSizing: "border-box",
        position: "relative",
        textAlign: "center",
        width: "100px",
        height: "22px",
        fontSize: "12px",
        color: "white",
        overflow: "hidden",
        transition: "background 200ms",
        textTransform: "uppercase"
      }}
    >
      <div
        style={{
          height: "100%",
          width: "calc(200% - 22px)",
          transition: "left 200ms",
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          left: value ? "0" : "calc(22px - 100%)"
        }}
      >
        <div
          style={{
            flex: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            paddingLeft: "2px"
          }}
        >
          Granted
        </div>
        <div
          style={{
            width: "18px",
            height: "18px",
            background: "white",
            borderRadius: "9px",
            left: "50%",
            margin: "2px 0"
          }}
        />
        <div
          style={{
            flex: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            paddingRight: "2px"
          }}
        >
          Denied
        </div>
      </div>
      <input
        onChange={useCallback(e => onChange(e.currentTarget.checked), [
          onChange
        ])}
        onFocus={useCallback(() => setHasFocus(true), [setHasFocus])}
        onBlur={useCallback(() => setHasFocus(false), [setHasFocus])}
        type="checkbox"
        checked={value}
        style={{
          margin: "0",
          border: hasFocus ? "2px solid white" : "none",
          background: "hsla(0, 0%, 0%, 0)",
          position: "absolute",
          top: "0",
          left: "0",
          height: "100%",
          width: "100%",
          WebkitAppearance: "none"
        }}
      />
    </div>
  );
}

export function Authorize({
  clearAuthorization,
  fetchOptionsOverride
}: {
  clearAuthorization: () => void;
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
}): ReactElement<any> {
  const url = new URL(window.location.href);

  const paramsResponseType = url.searchParams.get("response_type") || null;
  const paramsState = url.searchParams.get("state") || null;
  const paramsClientId = url.searchParams.get("client_id") || null;
  const paramsRedirectUri = url.searchParams.get("redirect_uri") || null;
  const paramsScope = url.searchParams.get("scope") || null;

  // If we end up creating a new grant, this is the ID we'll use.
  const [speculativeGrantId, setSpeculativeGrantId] = useState(() => v4());

  // Parse the scopes
  const requestedScopeTemplates = paramsScope ? paramsScope.split(" ") : null;
  let requestedScopeTemplatesAreValid: boolean | null = null;
  if (requestedScopeTemplates) {
    try {
      // Make sure that the template does not contain variables in addition to
      // those that can be used here.
      inject(requestedScopeTemplates, {
        /* eslint-disable @typescript-eslint/camelcase */
        current_client_id: "",
        current_grant_id: "",
        current_user_id: "",
        current_authorization_id: ""
        /* eslint-enable @typescript-eslint/camelcase */
      });

      requestedScopeTemplatesAreValid = true;
    } catch (error) {
      requestedScopeTemplatesAreValid = false;
    }
  }

  // Get the user, grant, and client from the API.
  const { loading, cacheValue } = useGraphQL<
    {
      viewer: null | {
        user: null | {
          id: string;
          name: null | string;
          grant: null | {
            id: string;
            scopes: null | string[];
            enabled: boolean;
          };
        };
      };
      client: null | {
        id: string;
        name: string;
        urls: string[];
      };
      explanations: null | ReadonlyArray<{
        scope: string;
        description: string;
      }>;
    },
    { clientId: string }
  >({
    fetchOptionsOverride,
    loadOnMount: paramsClientId ? true : false,
    operation: {
      query: `
        query($clientId: ID!) {
          viewer {
            user {
              id
              name
              grant(clientId: $clientId) {
                id
                scopes
                enabled
              }
            }
          }

          client(id: $clientId) {
            id
            name
            urls
          }

          explanations {
            scope
            description
          }
        }
      `,
      variables: {
        clientId: paramsClientId || ""
      }
    }
  });

  const user = cacheValue?.data?.viewer?.user;
  const client = cacheValue?.data?.client;
  const grant = user?.grant?.enabled ? user.grant : undefined;
  const urls = client?.urls;
  const explanations = cacheValue?.data?.explanations;

  // These decisions override the default behavior, which is to
  const [overrides, setOverrides] = useState<{ [scope: string]: boolean }>({});

  const clientId = client?.id || null;
  const grantId = grant?.id || speculativeGrantId;
  const userId = user?.id || null;
  const requestedScopes = useMemo(
    () =>
      simplify(
        inject(
          requestedScopeTemplates
            ? [...requestedScopeTemplates, ...implicitScopes]
            : implicitScopes,
          {
            /* eslint-disable @typescript-eslint/camelcase */
            current_authorization_id: null,
            current_client_id: clientId,
            current_grant_id: grantId,
            current_user_id: userId
            /* eslint-enable @typescript-eslint/camelcase */
          }
        )
      ),
    [requestedScopeTemplates, clientId, grantId, userId]
  );

  const grantedScopes = grant?.scopes;
  const grantedScopesExplanations = useMemo(
    () =>
      explanations && grantedScopes
        ? match(explanations, grantedScopes, {
            currentAuthorizationId: null,
            currentGrantId: grantId,
            currentUserId: userId,
            currentClientId: clientId
          })
        : [],
    [explanations, grantedScopes, clientId, grantId, userId]
  );

  const newRequestedScopes = grant?.scopes
    ? getDifference(
        grant.scopes.filter(s => overrides[s] !== false),
        requestedScopes
      )
    : requestedScopes;

  const newRequestedScopesExplanations = useMemo(
    () =>
      explanations
        ? match(explanations, newRequestedScopes, {
            currentAuthorizationId: null,
            currentGrantId: grantId,
            currentUserId: userId,
            currentClientId: clientId
          })
        : [],
    [explanations, newRequestedScopes, clientId, grantId, userId]
  );

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [operating, setOperating] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  async function onGrantAccess(): Promise<void> {
    if (!paramsRedirectUri) return;
    if (!user || !client) return;

    setOperating(true);
    try {
      let operation;
      if (grant) {
        operation = graphql.operate<
          {
            createGrants?: undefined;
            updateGrants: null | ReadonlyArray<null | {
              codes: null | string[];
              scopes: null | string[];
            }>;
          },
          {
            id: string;
            scopes: string[];
          }
        >({
          fetchOptionsOverride,
          operation: {
            query: `
              mutation($id: ID!, $scopes: [Scope!]!) {
                updateGrants(
                  grants: [{id: $id, scopes: $scopes, generateCodes: 1}]
                ) {
                  codes
                  scopes
                }
              }
            `,
            variables: {
              id: grant.id,
              scopes: simplify(
                [...(grant.scopes || []), ...requestedScopes].filter(
                  s => overrides[s] !== false
                )
              )
            }
          }
        });
      } else {
        operation = graphql.operate<
          {
            updateGrants?: undefined;
            createGrants: null | ReadonlyArray<null | {
              codes: null | string[];
              scopes: null | string[];
            }>;
          },
          {
            id: string;
            clientId: string;
            userId: string;
            scopes: string[];
          }
        >({
          fetchOptionsOverride,
          operation: {
            query: `
              mutation($id: ID!, $clientId: ID!, $userId: ID!, $scopes: [Scope!]!) {
                createGrants(
                  grants: [{
                    id: $id,
                    clientId: $clientId,
                    userId: $userId,
                    scopes: $scopes
                  }]
                ) {
                  codes
                  scopes
                }
              }
            `,
            variables: {
              id: speculativeGrantId,
              clientId: client.id,
              userId: user.id,
              scopes: requestedScopes
            }
          }
        });
      }

      const result = await operation.cacheValuePromise;
      if (result.fetchError) {
        setErrors([result.fetchError]);
        return;
      }

      if (result.graphQLErrors?.length) {
        setErrors(result.graphQLErrors.map(e => e.message));
        return;
      }

      const final =
        result?.data?.updateGrants?.[0] ?? result?.data?.createGrants?.[0];

      const code =
        (final?.codes && [...final.codes].sort().reverse()[0]) || null;

      if (!code) {
        setErrors([
          "No code was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations and authorization secrets."
        ]);
        return;
      }

      // We have successfully authenticated!
      // Zero the error.
      setErrors([]);

      // Redirect
      const url = new URL(paramsRedirectUri);
      if (paramsState) url.searchParams.set("state", paramsState);
      url.searchParams.set("code", code);
      setRedirecting(true);
      setSpeculativeGrantId(v4());
      window.location.replace(url.href);
    } catch (error) {
      setErrors([error.message]);
      return;
    } finally {
      setOperating(false);
    }
  }

  useEffect(() => {
    // Make sure we're ready and it's safe to redirect the user
    if (
      paramsClientId &&
      paramsRedirectUri &&
      urls?.includes(paramsRedirectUri)
    ) {
      const url = new URL(paramsRedirectUri);
      if (paramsState) url.searchParams.set("state", paramsState);

      if (paramsResponseType !== "code") {
        url.searchParams.append("error", "unsupported_response_type");
        url.searchParams.append(
          "error_description",
          'The `response_type` must be set to "code".'
        );
      }

      if (requestedScopeTemplatesAreValid === false) {
        url.searchParams.append("error", "invalid_scope ");
        url.searchParams.append(
          "error_description",
          "If set, the `scope` must be contain a space-separated list of valid authx scopes."
        );
      }

      // We have an error to redirect
      if (url.searchParams.has("error")) {
        setRedirecting(true);
        setSpeculativeGrantId(v4());
        window.location.replace(url.href);
        return;
      }

      // Check that all requested scopes are already granted
      const grantedScopes = grant?.scopes;
      if (
        grantedScopes &&
        requestedScopeTemplates &&
        isSuperset(grantedScopes, requestedScopeTemplates)
      ) {
        // TODO: We need to allow the app to force us to show a confirmation
        // screen. IIRC this is part of the OpenID Connect spec, but I have
        // useless airplane wifi right now. This should be an easy thing to
        // implement here, so we can enable automatic redirection.
        //
        // Found the spec: https://openid.net/specs/openid-connect-core-1_0.html#rfc.section.3.1.2.1
        //
        // onGrantAccess();
      }
    }
  }, [
    paramsClientId,
    paramsRedirectUri,
    urls,
    paramsState,
    paramsResponseType,
    requestedScopeTemplates,
    requestedScopeTemplatesAreValid,
    grant
  ]);

  // This is an invalid request
  if (
    !paramsClientId ||
    !paramsRedirectUri ||
    (urls && !urls.includes(paramsRedirectUri)) ||
    paramsResponseType !== "code" ||
    requestedScopeTemplatesAreValid === false
  ) {
    return (
      <div>
        <h1>Authorize</h1>
        <div className="panel">
          {!paramsClientId ? (
            <p className="error">
              Parameter <span className="code">client_id</span> must be
              specified.
            </p>
          ) : null}
          {!paramsRedirectUri ? (
            <p className="error">
              Parameter <span className="code">redirect_uri</span> must be
              specified.
            </p>
          ) : null}
          {paramsRedirectUri && urls && !urls.includes(paramsRedirectUri) ? (
            <p className="error">
              The specified <span className="code">redirect_uri</span> is not
              registered with the client.
            </p>
          ) : null}
          {paramsResponseType !== "code" ? (
            <p className="error">
              Parameter <span className="code">response_type</span> must be set
              to &quot;code&quot;.
            </p>
          ) : null}
          {requestedScopeTemplatesAreValid === false ? (
            <p className="error">
              If set, the <span className="code">scope</span> must be contain a
              space-separated list of valid authx scopes.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Internal error
  if (!user || !client) {
    return (
      <div>
        <h1>Authorize</h1>
        <div className="panel">
          {loading || operating || redirecting ? (
            <p>Loading...</p>
          ) : (
            <Fragment>
              {!user ? <p className="error">Unable to load user.</p> : null}
              {user && !client ? (
                <p className="error">
                  Unable to load client. Make sure you have access to read
                  clients.
                </p>
              ) : null}
            </Fragment>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Authorize</h1>
      <div className="panel">
        {loading || operating || redirecting ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p>
              Welcome
              {" " + user?.name ?? ""}!
              <button
                onClick={e => {
                  e.preventDefault();
                  clearAuthorization();
                }}
                type="button"
                style={{
                  background: "hsl(206, 0%, 80%)",
                  color: "hsl(0, 0%, 9%)",
                  borderRadius: "14px",
                  margin: "0 14px"
                }}
              >
                Log Out
              </button>
            </p>

            {grant?.scopes?.length ? (
              <>
                <p>
                  The app <strong>{client.name}</strong> has previously been
                  granted the following scopes:
                </p>
                <table className="info">
                  <tbody>
                    {grant.scopes.map((s, i) => {
                      const explanations =
                        (grantedScopesExplanations.filter(e => {
                          return e && isSuperset(s, e.scope);
                        }) as ReadonlyArray<{
                          scope: string;
                          description: string;
                        }>) || [];

                      const explanationScopes = new Set(
                        simplify(explanations.map(({ scope }) => scope))
                      );

                      return (
                        <Fragment key={i}>
                          <tr>
                            <td
                              colSpan={2}
                              style={{
                                paddingBottom: "0px",
                                borderTop:
                                  i > 0
                                    ? "2px solid hsla(0, 0%, 100%, 0.04)"
                                    : undefined
                              }}
                            >
                              <Scope>{s}</Scope>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              {explanations.length ? (
                                <ul
                                  style={{
                                    fontSize: "14px",
                                    padding: "0 0 0 10px",
                                    margin: "0"
                                  }}
                                >
                                  {explanations
                                    .filter(e => explanationScopes.has(e.scope))
                                    .map(e => (
                                      <li
                                        style={{ margin: "10px" }}
                                        key={e.scope}
                                      >
                                        {e.description}
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <div
                                  style={{
                                    opacity: 0.8,
                                    fontSize: "14px",
                                    margin: "10px"
                                  }}
                                >
                                  No explanations found.
                                </div>
                              )}
                            </td>
                            <td style={{ width: "100px" }}>
                              <Checkbox
                                value={overrides[s] === false ? false : true}
                                onChange={v =>
                                  setOverrides({
                                    ...overrides,
                                    [s]: v
                                  })
                                }
                              />
                            </td>
                          </tr>
                        </Fragment>
                      );
                    }) || null}
                  </tbody>
                </table>
              </>
            ) : null}

            {newRequestedScopes.length ? (
              <>
                {grant?.scopes?.length ? (
                  <p>It is also requesting access to the following scopes:</p>
                ) : (
                  <p>
                    The app &quot;{client.name}&quot; is requesting access to
                    the following scopes:
                  </p>
                )}

                <table className="info">
                  <tbody>
                    {newRequestedScopes.map((s, i) => {
                      const explanations =
                        (newRequestedScopesExplanations.filter(e => {
                          return e && isSuperset(s, e.scope);
                        }) as ReadonlyArray<{
                          scope: string;
                          description: string;
                        }>) || [];

                      const explanationScopes = new Set(
                        simplify(explanations.map(({ scope }) => scope))
                      );

                      return (
                        <Fragment key={i}>
                          <tr>
                            <td
                              colSpan={2}
                              style={{
                                paddingBottom: "0px",
                                borderTop:
                                  i > 0
                                    ? "2px solid hsla(0, 0%, 100%, 0.04)"
                                    : undefined
                              }}
                            >
                              <Scope>{s}</Scope>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              {explanations.length ? (
                                <ul
                                  style={{
                                    fontSize: "14px",
                                    padding: "0 0 0 10px",
                                    margin: "0"
                                  }}
                                >
                                  {explanations
                                    .filter(e => explanationScopes.has(e.scope))
                                    .map(e => (
                                      <li
                                        style={{ margin: "10px" }}
                                        key={e.scope}
                                      >
                                        {e.description}
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <div
                                  style={{
                                    opacity: 0.8,
                                    fontSize: "14px",
                                    margin: "10px"
                                  }}
                                >
                                  No explanations found.
                                </div>
                              )}
                            </td>
                            <td style={{ width: "100px" }}>
                              <Checkbox
                                value={overrides[s] === false ? false : true}
                                onChange={v =>
                                  setOverrides({
                                    ...overrides,
                                    [s]: v
                                  })
                                }
                              />
                            </td>
                          </tr>
                        </Fragment>
                      );
                    }) || null}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>
        )}

        {errors.length
          ? errors.map((error, i) => (
              <p key={i} className="error">
                {error}
              </p>
            ))
          : null}

        {loading || operating || redirecting ? null : (
          <div style={{ display: "flex", margin: "14px" }}>
            <input
              onClick={e => {
                e.preventDefault();
                onGrantAccess();
              }}
              style={{ flex: "1", marginRight: "14px" }}
              type="button"
              value="Save &amp; Continue"
            />
            <input
              onClick={e => {
                e.preventDefault();
                const url = new URL(paramsRedirectUri);
                url.searchParams.set("error", "access_denied");
                if (paramsState) url.searchParams.set("state", paramsState);
                setRedirecting(true);
                setSpeculativeGrantId(v4());
                window.location.replace(url.href);
              }}
              className="danger"
              style={{ flex: "1", marginLeft: "11px" }}
              type="button"
              value="Cancel"
            />
          </div>
        )}
      </div>
    </div>
  );
}
