import { Domain, Segment } from "./domain.js";
import { Scope, AnyMultiple, AnySingle } from "./scope.js";

export function print(scope: Scope): string {
  return scope
    .map((domain: Domain) =>
      domain
        .map((segment: Segment) => {
          switch (segment) {
            case AnyMultiple:
              return "**";
            case AnySingle:
              return "*";
            default:
              return segment;
          }
        })
        .join(".")
    )
    .join(":");
}
