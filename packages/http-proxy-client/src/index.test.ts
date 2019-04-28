import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import AuthXClientProxy from ".";

// requireGrantedScopes: ["AuthX:user.equal.self:read.basic"]

const proxy = new AuthXClientProxy({
  authxUrl: "http://127.0.0.1:3001",

  clientId: "3ac01e62-faba-4644-b4c0-7979775717ac",
  clientSecret: "279b6f23893778b5edf981867a78a86d60c9bd3d",
  clientUrl: "http://127.0.0.1:3000",
  requestGrantedScopes: ["AuthX:user.equal.self:read.basic"],
  rules: [
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
          proxyTarget: "http://217.0.0.1:3002",
          sendAuthorizationResponseAs: 407,
          sendTokenToTargetWithScopes: ["authx.prod:**:**"]
        };
      }
    },
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
        proxyTarget: "http://217.0.0.1:3003",
        sendAuthorizationResponseAs: 303,
        sendTokenToTargetWithScopes: []
      }
    }
  ]
});
