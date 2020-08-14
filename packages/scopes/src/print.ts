import { Scope, AnyMultiple, AnySingle } from "./scope";

export function print(scope: Scope): string {
  return scope
    .map(domain =>
      domain
        .map(segment => {
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
