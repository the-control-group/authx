import { QueryResult } from "pg";
import { ReadonlyDataLoaderExecutor } from "../../loader";

export interface BuiltQuery {
  query: string;
  params: any[];
}

export class Rule {
  toSQLWhere(): string {
    return "";
  }

  toSQLLimit(): string {
    return "";
  }

  toSQLOrder(): string {
    return "";
  }

  toSQLParams(): { [key: string]: any } {
    return [];
  }

  private static buildQuery(root: string, rules: Rule[]): BuiltQuery {
    let ret = root;

    const whereClause = rules
      .map(it => it.toSQLWhere())
      .filter(it => it)
      .join(" AND ");
    if (whereClause) ret += ` WHERE ${whereClause} `;

    const orderByClauseElements = rules
      .map(it => it.toSQLOrder())
      .filter(it => it);

    if (orderByClauseElements.length == 1) {
      ret += ` ${orderByClauseElements[0]}`;
    } else if (orderByClauseElements.length > 1) {
      throw "Only one ORDER BY element is allowed in rules";
    }

    const limitClauseElements = rules
      .map(it => it.toSQLLimit())
      .filter(it => it);

    if (limitClauseElements.length == 1) {
      ret += ` LIMIT ${limitClauseElements[0]}`;
    } else if (limitClauseElements.length > 1) {
      throw "Only one LIMIT element is allowed in rules";
    }

    const allParams: { [key: string]: any } = {};
    const paramPairs = [];
    for (const rule of rules) {
      const params = rule.toSQLParams();
      for (const k in params) {
        if (typeof allParams[k] != "undefined")
          throw `Param ${k} defined twice!`;

        allParams[k] = params[k];

        paramPairs.push([k, params[k]]);
      }
    }

    for (let i = 0; i < paramPairs.length; ++i) {
      const search = `:${paramPairs[i][0]}`;
      if (!ret.includes(search))
        throw `SQL string "${ret}" must contain ${search}`;
      ret = ret.replace(search, `$${i + 1}`);
    }

    return {
      query: ret,
      params: paramPairs.map(it => it[1])
    };
  }

  /**
   * Applies the passed in set of rules and returns a list of entities
   * Note that due to the way the pagination rules work, the client should NOT assume
   * that the number of entities returned will match the number the user requested.
   * The Connection classes are designed to ensure the user will get the right number of entities.
   *
   * Note that for the rules engine to work, there are two assumptions about the underlying data
   * that must hold true:
   * - Every entity must have an id, called "entity_id" in the database and "id" on the object
   * - The data processing rules must never result in multiple entities with the same ID
   * @param tx
   * @param root
   * @param rules
   */
  static async runQuery<T>(
    tx: ReadonlyDataLoaderExecutor,
    root: string,
    rules: Rule[]
  ): Promise<QueryResult> {
    const built = this.buildQuery(root, rules);

    return tx.connection.query(built.query, built.params);
  }
}
