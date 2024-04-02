import { ConnectionArguments } from "graphql-relay";
import { Rule } from "./Rule.js";
import { CursorConnection } from "../../graphql/connection/CursorConnection.js";

export class ReverseCursorRule extends Rule {
  public readonly before: string | null = null;
  public readonly last: number | null = null;

  constructor(args: ConnectionArguments) {
    super();
    if (args.before) this.before = CursorConnection.fromCursor(args.before);
    if (args.last) this.last = args.last;
  }

  toSQLWhere(): string {
    if (this.before !== null) {
      return "entity_id < :entity_id_before";
    } else {
      return "";
    }
  }

  toSQLLimit(): string {
    if (this.last !== null) {
      return `:limit_last`;
    } else {
      return "";
    }
  }

  toSQLParams(): { [p: string]: any } {
    const ret: { [p: string]: any } = {};

    if (this.last !== null) ret["limit_last"] = this.last + 1;
    if (this.before !== null) ret["entity_id_before"] = this.before;

    return ret;
  }

  toSQLOrder(): string {
    return "ORDER BY id DESC";
  }
}
