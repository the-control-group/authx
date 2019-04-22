This is AuthX. It's named AuthX because it's an "exchange" of sorts, consolidating identities from several upstream authorities into a single identity for downstream clients. AuthX uses the OAuth2 framework in both directions, and adds a robust _authorization_ layer.

This is a monorepo that contains several useful node packages:

### AuthX

The AuthX package contains the core application and API manages users, credentials, roles, clients, authorities, grants, and tokens.

### AuthX Interface

The AuthX Interface is a reference user interface that provides the visual components necessary for a user to authenticate herself and authorize a client to access resources on her behalf.

The small, react-powered app features a pluggable architecture that can be used to support additional authorization strategies.

### AuthX Manager

**WORK IN PROGRESS** The Authx Manager is an administration user interface for AuthX.

### AuthX Proxy

The AuthX proxy is an HTTP proxy which can be put in front of a client or resource.
