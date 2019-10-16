import { isSuperset, simplify } from "@authx/scopes";

export function makeAdministrationScopes(
  access: string[],
  map: { [key: string]: string }
): string[] {
  return simplify(
    Object.entries(map).reduce<string[]>((acc, [before, after]) => {
      if (isSuperset(access, before)) {
        acc.push(after);
      }
      return acc;
    }, [])
  );
}
