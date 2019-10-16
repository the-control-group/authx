import { isSuperset, simplify } from "@authx/scopes";

export function makeAdministrationScopes(
  access: string[],
  realm: string,
  entity: string,
  id: string,
  actions: string[]
): string[] {
  const exhaustive: string[] = [];
  const available: string[] = [];
  for (const action of actions) {
    const scope = `${realm}:${entity}.${id}:${action}`;
    exhaustive.push(scope);
    if (isSuperset(access, `${realm}:${entity}.:${action}`)) {
      available.push(scope);
    }
  }

  const optimizations: string[] = [];
  for (const scope of exhaustive) {
    const [realm, context, action] = scope.split(":");
    const segments = action.split(".");

    // Speculatively try grouping actions with trailing `**`
    for (let i = 0; i < segments.length - 1; i++) {
      const speculation = `${realm}:${context}:${segments
        .slice(0, i)
        .join(".")}.**`;

      if (
        exhaustive.filter(s => isSuperset(speculation, s)).length ===
        available.filter(s => isSuperset(speculation, s)).length
      ) {
        // The speculative optimization is applicable because all encompassed
        // scopes are currently available.
        optimizations.push(speculation);

        // Because we are building from left to right, we can break early since
        // all future speculations will be strict subsets of the current one.
        break;
      }
    }
  }

  return simplify([...available, ...optimizations]);
}
