FROM node:11

# Install dependencies and build packages
WORKDIR /workspace
COPY . .
RUN yarn install

# Run the demo server in the authx package
WORKDIR /workspace/packages/authx
EXPOSE 80
CMD [ "yarn", "start:development" ]
