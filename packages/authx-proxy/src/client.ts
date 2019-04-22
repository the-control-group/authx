export function client(): Promise<void> {
  const parsedRequestUrl = new URL(url);
  const parsedClientUrl = new URL(this.config.client.url);
  if (
    parsedClientUrl.origin === parsedRequestUrl.origin &&
    parsedClientUrl.pathname === parsedRequestUrl.pathname &&
    // Make sure that every search param configured in the client url is
    // identical in the request url.
    [...parsedClientUrl.searchParams.keys()].every(key => {
      const clientParamValues = parsedClientUrl.searchParams.getAll(key);
      const requestParamValues = parsedRequestUrl.searchParams.getAll(key);
      return (
        clientParamValues.length === requestParamValues.length &&
        clientParamValues.every((v, i) => requestParamValues[i] === v)
      );
    })
  ) {
    // Display an error.
    const errors = parsedRequestUrl.searchParams.getAll("error");
    if (errors.length) {
      const errorDescriptions = parsedRequestUrl.searchParams.getAll(
        "error_description"
      );

      const body = `
<html>
  <head><title>Error</title></head>
  <body>
    ${(errors.length === errorDescriptions.length
      ? errorDescriptions
      : errors
    ).map(
      message =>
        `<div>${message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")}</div>`
    )}
  </body>
</html>
`;
      response.end(body);
      return;
    }

    // No code was returned.
    const code = parsedRequestUrl.searchParams.get("code");
    if (!code) {
      const body = `
<html>
  <head><title>Error</title></head>
  <body>
    <div>The <span style="font-family: mono;">code</span> parameter is missing from the OAuth 2.0 response.</div>
  </body>
</html>
`;
      response.end(body);
      return;
    }

    try {
      const token = await fetch(this.config.client.oauthProviderUrl, {
        method: "POST",
        body: JSON.stringify({
          // eslint-disable-next-line @typescript-eslint/camelcase
          client_id: this.config.client.id,
          // eslint-disable-next-line @typescript-eslint/camelcase
          client_secret: this.config.client.secret,
          code: code,
          // Note that this requests all the scopes that have already been
          // granted to the client, not *all* scopes.
          scope: "**:**:**"
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (error) {}
  }
}
