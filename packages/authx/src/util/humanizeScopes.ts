import { isStrictSuperset, extract } from "@authx/scopes";

export type PatternDescriptionMap = {
  [pattern: string]: string;
};

function escapeRegExp(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function validateTemplate(template: string): boolean {
  const patterns = template.split(":");
  return (
    patterns.length === 3 &&
    patterns.every(pattern =>
      pattern
        .split(".")
        .every(
          part =>
            part === "" ||
            part === "*" ||
            part === "**" ||
            /^[a-zA-Z0-9_-]+$/.test(part) ||
            /^\([a-zA-Z0-9_]+\)$/.test(part) ||
            /^\{[a-zA-Z0-9_]+\}$/.test(part)
        )
    )
  );
}

function substituteDescriptionMap(
  map: PatternDescriptionMap,
  substitutions: { [key: string]: null | string }
): PatternDescriptionMap {
  const patterns: { [key: string]: RegExp } = Object.create(null);

  return Object.entries(map).reduce<{ [key: string]: string }>(
    (acc, [key, value]) => {
      for (const [variableKey, variableValue] of Object.entries(
        substitutions
      )) {
        const pattern = (patterns[variableKey] =
          patterns[variableKey] ||
          new RegExp(`(?<!\\\\)(\\{${escapeRegExp(variableKey)}\\})`, "g"));

        const _key = key.replace(pattern, variableValue || "");
        value = value.replace(pattern, variableValue || "");

        // If the variable value is null and it is used in the map key, we will
        // remove the entire entry from the map.
        if (variableValue === null && key !== _key) {
          return acc;
        }

        key = _key;
      }

      acc[key] = value;
      return acc;
    },
    {}
  );
}

export function humanizeScopes(
  maps: [PatternDescriptionMap, PatternDescriptionMap, PatternDescriptionMap][],
  substitutions: {
    currentAuthorizationId: null | string;
    currentUserId: null | string;
    currentGrantId: null | string;
  },
  scopes: string[]
): ReadonlyArray<string> {
  // Inject context variables.
  const configs = maps.map(([realm, context, action]): [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ] => {
    // While we use lowerCamelCase in javascript, we use snake_case for
    // substitutions in scopes.
    const variables = {
      /* eslint-disable @typescript-eslint/camelcase */
      current_authorization_id: substitutions.currentAuthorizationId,
      current_user_id: substitutions.currentUserId,
      current_grant_id: substitutions.currentGrantId
      /* eslint-enable @typescript-eslint/camelcase */
    };

    return [
      substituteDescriptionMap(realm, variables),
      substituteDescriptionMap(context, variables),
      substituteDescriptionMap(action, variables)
    ];
  });

  const resultScopes: string[] = [];
  const resultText: string[] = [];

  // Create combinations.
  for (const [realm, context, action] of configs) {
    for (const [rk, rv] of Object.entries(realm)) {
      for (const [ck, cv] of Object.entries(context)) {
        for (const [ak, av] of Object.entries(action)) {
          // Test and extract variables from each scope.
          for (const { scope, parameters } of extract(
            `${rk}:${ck}:${ak}`,
            scopes
          )) {
            // Assemble the human readable text.
            let text = `${rv}: ${av.slice(0, 1).toUpperCase()}${av.slice(
              1
            )} ${cv}.`;

            // Apply dynamic substitutions to the text.
            for (const [variableKey, variableValue] of Object.entries(
              parameters
            )) {
              const pattern = new RegExp(
                `(?<!\\\\)(\\(${escapeRegExp(variableKey)}\\))`,
                "g"
              );
              text = text.replace(pattern, variableValue);
            }

            resultScopes.push(scope);
            resultText.push(text);
          }
        }
      }
    }
  }

  // Filter out redundant text.
  return resultText.filter(
    (text, i) => !isStrictSuperset(resultScopes, resultScopes[i])
  );
}
