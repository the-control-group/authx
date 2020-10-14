type PatternDescriptionMap = {
  [pattern: string]: string;
};

export function generateScopeTables(
  configs: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][]
): { title: string; table: string[][] }[] {
  const data: {
    [realm: string]: {
      title: string;
      header: Set<string>;
      rows: { [context: string]: { [action: string]: string } };
    };
  } = Object.create(null);

  // Create combinations.
  for (const [realm, context, action] of configs) {
    for (const [rk, rv] of Object.entries(realm)) {
      const table = (data[rk] = data[rk] || {
        title: rv,
        header: new Set(),
        rows: Object.create(null),
      });

      for (const [ck, cv] of Object.entries(context)) {
        const row = (table.rows[ck] = table.rows[ck] || Object.create(null));
        for (const [ak, av] of Object.entries(action)) {
          table.header.add(ak);
          const description = `${av} ${cv}`;
          if (row[ak] && row[ak] !== description) {
            throw new Error(
              `Duplicate value for context "${ck}" and action "${ak}".`
            );
          }
          row[ak] = description;
        }
      }
    }
  }

  const results = [];
  for (const [realm, { title, header, rows }] of Object.entries(data)) {
    const columnKeys = [...header].sort();
    const rowKeys = Object.keys(rows).sort();
    if (!rowKeys.length) {
      continue;
    }

    const table = [[realm, ...columnKeys]];
    for (const r of rowKeys) {
      const row = [r];
      for (const c of columnKeys) {
        row.push(rows[r][c] || "");
      }
      table.push(row);
    }

    results.push({ title, table });
  }

  // Remove aggregate scopes. This is the opposite of "simplify" in that we are
  // interested in the "raw" scopes, and will discard aggregates.

  // TODO: factor

  return results;
}
