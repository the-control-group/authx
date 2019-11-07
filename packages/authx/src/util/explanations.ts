import { isStrictSuperset, extract, inject } from "@authx/scopes";

export interface DomainDescriptionMap {
  [domain: string]: string;
}

export interface ExplanationTemplate {
  pattern: string;
  description: string;
}

export interface Explanation {
  scope: string;
  description: string;
}

export function generateExplanationTemplates(
  config: [DomainDescriptionMap, DomainDescriptionMap, DomainDescriptionMap][]
): ReadonlyArray<ExplanationTemplate> {
  const results = [];

  for (const [realm, context, action] of config) {
    for (const [rk, rv] of Object.entries(realm)) {
      for (const [ck, cv] of Object.entries(context)) {
        for (const [ak, av] of Object.entries(action)) {
          results.push({
            pattern: `${rk}:${ck}:${ak}`,
            description: `${rv}: ${av.slice(0, 1).toUpperCase()}${av.slice(
              1
            )} ${cv}.`
          });
        }
      }
    }
  }

  return results;
}

function escapeRegExp(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortByPrecedence(
  a: { precedence: number },
  b: { precedence: number }
): number {
  return a.precedence < b.precedence ? 1 : a.precedence > b.precedence ? -1 : 0;
}

export function getExplanations(
  templates: ReadonlyArray<ExplanationTemplate>,
  substitutions: {
    currentAuthorizationId: null | string;
    currentUserId: null | string;
    currentGrantId: null | string;
    currentClientId: null | string;
  },
  scopes: string[]
): ReadonlyArray<Explanation> {
  const explanationsByScope: {
    [scope: string]: (Explanation & { precedence: number })[];
  } = Object.create(null);

  for (const template of templates) {
    // Test and extract variables from each scope.
    for (const { scope: scopeTemplate, parameters } of extract(
      template.pattern,
      scopes
    )) {
      console.log(template.pattern);
      console.log(scopeTemplate, "\n\n");

      const scope = inject(scopeTemplate, {
        /* eslint-disable @typescript-eslint/camelcase */
        current_authorization_id: substitutions.currentAuthorizationId,
        current_user_id: substitutions.currentUserId,
        current_grant_id: substitutions.currentGrantId,
        current_client_id: substitutions.currentClientId
        /* eslint-enable @typescript-eslint/camelcase */
      });

      if (!scope) continue;

      // Apply dynamic substitutions to the description.
      let description = template.description;
      for (const [variableKey, variableValue] of Object.entries(parameters)) {
        const domain = new RegExp(
          `(?<!\\\\)(\\(${escapeRegExp(variableKey)}\\))`,
          "g"
        );
        description = description.replace(domain, variableValue);
      }

      explanationsByScope[scope] = explanationsByScope[scope] || [];
      explanationsByScope[scope].push({
        scope,
        description: description,
        precedence:
          0 +
          (template.pattern.includes("(") ? -2 : 0) +
          (template.pattern.includes("{") ? -1 : 0)
      });
    }
  }

  // Filter the results to remove redundant explanations that were not
  // explicitly requested.
  const allExplanationScopes = Object.keys(explanationsByScope);
  const filteredResults: Explanation[] = [];
  for (const scope of allExplanationScopes) {
    if (
      // The scope is part of a broader applicable explanation.
      isStrictSuperset(allExplanationScopes, scope) &&
      // The scope was not explicly requested.
      !scopes.includes(scope)
    ) {
      continue;
    }

    const explanation = explanationsByScope[scope].sort(sortByPrecedence)[0];
    if (explanation) {
      filteredResults.push({
        scope: explanation.scope,
        description: explanation.description
      });
    }
  }

  return filteredResults;
}
