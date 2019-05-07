import { IncomingMessage } from "http";
import AuthXClientProxy from ".";

const proxy = new AuthXClientProxy({
  authxUrl: `http://localhost:3000`,
  readinessUrl: "/_ready",

  // These need to match the values for your client in AuthX.
  clientId: "42410eac-b512-4478-a0de-9df50032c0cc",
  clientSecret: "f3c5e6575930412508597422554f6b35",
  clientUrl: "http://localhost:3001/auth/",

  // These are the scopes your client will request from users.
  requestGrantedScopes: ["AuthX:user.equal.self:read.basic"],

  rules: [
    // We want the front-end to be able to access the AuthX API without managing
    // credentials. To do this, we create a proxy that injects a token with all
    // the necessary scopes and nothing more.
    {
      test({ method, url }) {
        return method === "POST" && url === "/api/authx";
      },
      behavior(request: IncomingMessage) {
        // Rewrite the URL to match the API's expectations.
        request.url = "/graphql";

        // Because this is an API request, we don't want to redirect the browser
        // so we will return a 407 and include a `Location` header which the
        // front-end can use to redirect the user.
        return {
          proxyTarget: `https://www.google.com`,
          sendAuthorizationResponseAs: 407,
          sendTokenToTargetWithScopes: ["authx.prod:**:**"]
        };
      }
    },
    // These are static assets that we want publically cached by Google Cloud
    // CDN or Cloudflare. We won't require any auth for these endpoints.
    {
      test({ method, url }) {
        return method === "GET" && /^\/static(\/.*)?$/.test(url || "");
      },
      behavior: {
        proxyTarget: `https://www.google.com`
      }
    },
    // The rest of our routes render a single-page-app. We simply want to make
    // sure that we're
    {
      test() {
        return true;
      },

      // These requests are likely made directly by the user, so we can simply
      // redirect the user if we require more granted priviliges. Additionally,
      // we don't need to generate a token for this target, so we can leave off
      // `sendTokenToTargetWithScopes`. However, we still do want to ensure that
      // the user is authenticated and has granted us scopes that are necessary
      // for the app to work, so we will set `requireGrantedScopes`.
      behavior: {
        proxyTarget: `https://www.google.com`,
        sendAuthorizationResponseAs: 303,
        sendTokenToTargetWithScopes: []
      }
    }
  ]
});

proxy.listen(3001);

proxy.on("error", console.error.bind(console));
