import Router from "koa-router";
import body from "koa-body";
import fetch from "node-fetch";
import { Context, x } from "@authx/authx";

export function samlRouterFactory(): Router<any, { [x]: Context }> {
  const router = new Router<any, { [x]: Context }>();

  router.post(
    "/:authorityId/assert",
    body({ multipart: true, urlencoded: true, text: true, json: true }),
    async (ctx) => {
      const base = ctx[x].base;
      const saml = ctx.request.body ? ctx.request.body.SAMLResponse : "";
      const authorityId = ctx.params.authorityId;

      const result = await fetch(`${base}graphql`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation AuthenticateSaml($samlResponse: String!, $authorityId: ID!)
          {
            authenticateSaml(
              samlResponse: $samlResponse
              authorityId: $authorityId
            ){
              id
              secret
            }
          }`,
          variables: {
            samlResponse: saml,
            authorityId: authorityId,
          },
        }),
      });

      const data = await result.json();

      if (data.errors) {
        ctx.redirect(
          `${base}?${data.errors
            .map((it: any) => `errors=${encodeURIComponent(it.message)}`)
            .join("&")}&authorityId=${encodeURIComponent(authorityId)}`
        );
      } else {
        ctx.cookies.set(
          "strategy.saml.authorization_id",
          data.data.authenticateSaml.id,
          { httpOnly: false }
        );
        ctx.cookies.set(
          "strategy.saml.authorization_secret",
          data.data.authenticateSaml.secret,
          { httpOnly: false }
        );

        const destination =
          ctx.cookies.get("window.document.cookie") ||
          `${base}?authorityId=${encodeURIComponent(authorityId)}`;

        ctx.redirect(destination);
      }
    }
  );

  router.get("/:authorityId/metadata", async (ctx) => {
    const base = ctx[x].base;

    const result = await fetch(`${base}graphql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: `query GetMetadata($authorityId: ID!)
                {
                  authority(id: $authorityId) {
                    id,
                    __typename,
                    ... on SamlAuthority {
                      metadata
                    }
                  }
                }`,
        variables: {
          authorityId: ctx.params.authorityId,
        },
      }),
    });

    ctx.body = Buffer.from(
      (await result.json()).data.authority.metadata,
      "base64"
    ).toString("utf8");
    ctx.type = "application/samlmetadata+xml";
  });

  return router;
}
