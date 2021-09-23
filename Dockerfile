# base
# ----

FROM node:14 AS base

RUN mkdir -p /workspace
WORKDIR /workspace

ADD yarn.lock /workspace/yarn.lock
ADD .yarn /workspace/.yarn
ADD .yarnrc.yml /workspace/.yarnrc.yml
ADD package.json /workspace/package.json

ADD packages/authx/package.json /workspace/packages/authx/package.json
ADD packages/http-proxy-client/package.json /workspace/packages/http-proxy-client/package.json
ADD packages/http-proxy-web/package.json /workspace/packages/http-proxy-web/package.json
ADD packages/http-proxy-resource/package.json /workspace/packages/http-proxy-resource/package.json
ADD packages/interface/package.json /workspace/packages/interface/package.json
ADD packages/scopes/package.json /workspace/packages/scopes/package.json
ADD packages/strategy-email/package.json /workspace/packages/strategy-email/package.json
ADD packages/strategy-openid/package.json /workspace/packages/strategy-openid/package.json
ADD packages/strategy-password/package.json /workspace/packages/strategy-password/package.json
ADD packages/strategy-saml/package.json /workspace/packages/strategy-saml/package.json
ADD packages/tools/package.json /workspace/packages/tools/package.json

# Install all dependencies
RUN yarn install --immutable

# Add in the entire working directory
ADD . /workspace

CMD ["tail", "-f", "/dev/null"]
