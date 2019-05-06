# HTTP Proxy - Client

The AuthX proxy for clients is a flexible HTTP proxy designed to sit in front of a client.

## Configuration

The proxy is configured with an array of rules, which are checked in order against the request URL until a match is found. If no match is found, the proxy will respond with a status of `404`.

Here is a typical use case:
