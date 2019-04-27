import { AuthXProxy } from ".";
import { IncomingMessage, ServerResponse } from "http";

export interface Rule {
  readonly test: string | RegExp | ((url: string) => boolean);
  readonly behavior: string;
}

export interface Behavior<R extends Rule> {
  (
    proxy: AuthXProxy,
    keys: ReadonlyArray<string>,
    rule: R,
    request: IncomingMessage,
    response: ServerResponse
  ): void;
}
