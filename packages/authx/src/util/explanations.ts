import { isStrictSuperset, extract, inject } from "@authx/scopes";

export interface DomainDescriptionMap {
  [domain: string]: string;
}

export interface Explanation {
  scope: string;
  description: string;
}

export function generateExplanationTemplates(
  config: [DomainDescriptionMap, DomainDescriptionMap, DomainDescriptionMap][]
): ReadonlyArray<Explanation> {
  const results = [];

  for (const [realm, context, action] of config) {
    for (const [rk, rv] of Object.entries(realm)) {
      for (const [ck, cv] of Object.entries(context)) {
        for (const [ak, av] of Object.entries(action)) {
          results.push({
            scope: `${rk}:${ck}:${ak}`,
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

function sortByFreedom(
  { degreesOfFreedom: a }: { degreesOfFreedom: number[] },
  { degreesOfFreedom: b }: { degreesOfFreedom: number[] }
): number {
  if (a === b) return 0;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] === undefined) 1;
    if (a[i] === undefined) -1;
    return a[i] < b[i] ? -1 : 1;
  }

  return 0;
}

export function getExplanations(
  templates: ReadonlyArray<Explanation>,
  scopes: string[],
  substitutions: {
    currentAuthorizationId: null | string;
    currentUserId: null | string;
    currentGrantId: null | string;
    currentClientId: null | string;
  }
): ReadonlyArray<Explanation> {
  const explanationsByScope: {
    [scope: string]: (Explanation & { degreesOfFreedom: number[] })[];
  } = Object.create(null);

  for (const template of templates) {
    let templateScope: string = template.scope;

    // The score represents the degrees of freedom between the explanation
    // template and the matched scope. The lower the score, the more exact the
    // match.

    const templateSegmentCount = template.scope.split("{").length - 1;
    if (templateSegmentCount) {
      const injection = inject(template.scope, {
        /* eslint-disable @typescript-eslint/camelcase */
        current_authorization_id: substitutions.currentAuthorizationId,
        current_user_id: substitutions.currentUserId,
        current_grant_id: substitutions.currentGrantId,
        current_client_id: substitutions.currentClientId
        /* eslint-enable @typescript-eslint/camelcase */
      });

      if (injection === null) {
        continue;
      }

      templateScope = injection;
    }

    for (const { query, result, parameters } of extract(
      templateScope,
      scopes
    )) {
      // Apply dynamic substitutions to the description.
      let description = template.description;
      for (const [variableKey, variableValue] of Object.entries(parameters)) {
        const domain = new RegExp(
          `(?<!\\\\)(\\(${escapeRegExp(variableKey)}\\))`,
          "g"
        );
        description = description.replace(domain, variableValue);
      }

      explanationsByScope[result] = explanationsByScope[result] || [];
      explanationsByScope[result].push({
        scope: result,
        description: description,

        // TODO: I don't believe these are necessarily correct. However, they
        // work with my limited initial test cases, and I've already spent far
        // too much time on this.
        degreesOfFreedom: [
          // The "exact" degree of freedom.
          isStrictSuperset(query, result) ? 1 : 0,

          // The "parameter" degrees of freedom.
          Object.keys(parameters).length,

          // The "template" degrees of freedom.
          templateSegmentCount
        ]
      });
    }
  }

  // Filter the results to remove redundant explanations that were not
  // explicitly requested.
  const allExplanationScopes = Object.keys(explanationsByScope);
  const filteredResults: Explanation[] = [];
  for (const scope of allExplanationScopes) {
    if (
      // The scope was not explicly requested.
      !scopes.includes(scope) &&
      // The scope is part of a broader applicable explanation.
      allExplanationScopes.some(s => isStrictSuperset(s, scope))
    ) {
      continue;
    }

    const explanation = explanationsByScope[scope].sort(sortByFreedom)[0];
    if (explanation) {
      filteredResults.push({
        scope: explanation.scope,
        description: explanation.description
      });
    }
  }

  return filteredResults;
}
