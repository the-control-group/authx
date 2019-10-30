import React, {
  Fragment,
  ReactElement,
  useEffect,
  useContext,
  useCallback,
  useState
} from "react";

import {
  GraphQL,
  useGraphQL,
  GraphQLFetchOptionsOverride,
  GraphQLContext
} from "graphql-react";
import { isSuperset, getDifference, simplify, inject } from "@authx/scopes";

import v4 from "uuid/v4";

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

  // Parse the scopes
  const requestedScopeTemplates = paramsScope ? paramsScope.split(" ") : null;
  let requestedScopeTemplatesAreValid: boolean | null = null;
  if (requestedScopeTemplates) {
    try {
      // Make sure that the template does not contain variables in addition to
      // those that can be used here.
      inject(requestedScopeTemplates, {
        /* eslint-disable @typescript-eslint/camelcase */
        current_grant_id: "",
        current_user_id: ""
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
          };
        };
      };
      client: null | {
        id: string;
        name: string;
        urls: string[];
      };
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
              }
            }
          }

          client(id: $clientId) {
            id
            name
            urls
          }
        }
      `,
      variables: { clientId: paramsClientId || "" }
    }
  });

  const user =
    cacheValue &&
    cacheValue.data &&
    cacheValue.data.viewer &&
    cacheValue.data.viewer.user;
  const client = cacheValue && cacheValue.data && cacheValue.data.client;
  const grant = user && user.grant;
  const urls = client && client.urls;

  // These decisions override the default behavior, which is to
  const [overrides, setOverrides] = useState<{ [scope: string]: boolean }>({});

  const requestedScopes = requestedScopeTemplates
    ? user && grant
      ? inject(requestedScopeTemplates, {
          /* eslint-disable @typescript-eslint/camelcase */
          current_grant_id: grant.id,
          current_user_id: user.id
          /* eslint-enable @typescript-eslint/camelcase */
        })
      : requestedScopeTemplates
    : [];

  const newRequestedScopes =
    grant && grant.scopes
      ? getDifference(
          grant.scopes.filter(s => overrides[s] !== false),
          requestedScopes
        )
      : requestedScopes;

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
              mutation($id: ID!, $scopes: [String!]!) {
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
                [...(grant.scopes || []), ...requestedScope].filter(
                  s => overrides[s] !== false
                )
              )
            }
          }
        });
      } else {
        const id = v4();
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
              mutation($id: ID!, $clientId: ID!, $userId: ID!, $scopes: [String!]!) {
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
              id,
              clientId: client.id,
              userId: user.id,
              scopes: inject(requestedScopes, {
                /* eslint-disable @typescript-eslint/camelcase */
                current_grant_id: id,
                current_user_id: user.id
                /* eslint-enable @typescript-eslint/camelcase */
              })
            }
          }
        });
      }

      const result = await operation.cacheValuePromise;
      if (result.fetchError) {
        setErrors([result.fetchError]);
        return;
      }

      if (result.graphQLErrors && result.graphQLErrors.length) {
        setErrors(result.graphQLErrors.map(e => e.message));
        return;
      }

      const final =
        result.data &&
        ((result.data.updateGrants && result.data.updateGrants[0]) ||
          (result.data.createGrants && result.data.createGrants[0]));

      const code =
        (final && final.codes && [...final.codes].sort().reverse()[0]) || null;

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
      urls &&
      urls.includes(paramsRedirectUri)
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
        window.location.replace(url.href);
        return;
      }

      // Check that all requested scopes are already granted
      const grantedScopes = grant && grant.scopes;
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
              {" " + (user && user.name) || ""}!
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

            {grant && grant.scopes && grant.scopes.length ? (
              <>
                <p>
                  The app <strong>{client.name}</strong> has previously been
                  granted the following scopes:
                </p>
                <div className="info" style={{ display: "flex" }}>
                  <table style={{ flex: 1 }}>
                    <tbody>
                      {grant.scopes.map((s, i) => (
                        <tr key={i}>
                          <td>
                            <pre>{s}</pre>
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
                      )) || null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {newRequestedScopes.length ? (
              <>
                {grant && grant.scopes && grant.scopes.length ? (
                  <p>It is also requesting access to the following scopes:</p>
                ) : (
                  <p>
                    The app &quot;{client.name}&quot; is requesting access to
                    the following scopes:
                  </p>
                )}

                <div className="info" style={{ display: "flex" }}>
                  <table style={{ flex: 1 }}>
                    <tbody>
                      {newRequestedScopes.map((s, i) => (
                        <tr key={i}>
                          <td>
                            <pre>{s}</pre>
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
                      )) || null}
                    </tbody>
                  </table>
                </div>
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
