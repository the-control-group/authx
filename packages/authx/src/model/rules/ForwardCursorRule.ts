import { ConnectionArguments } from "graphql-relay";
import { Rule } from "./Rule.js";
import { CursorConnection } from "../../graphql/connection/CursorConnection.js";

/**
 * Rule that handles pagination if the user is paging forwards through the data
 * Always fetches one extra row from the data source so that the receiver can
 * determine if there is another page.
 */
export class ForwardCursorRule extends Rule {
  public readonly after: string | null = null;
  public readonly first: number | null = null;

  constructor(args: ConnectionArguments) {
    super();
    if (args.after) this.after = CursorConnection.fromCursor(args.after);
    if (args.first) this.first = args.first;
  }

  toSQLWhere(): string {
    if (this.after !== null) {
      return "entity_id > :entity_id_after";
    } else {
      return "";
    }
  }

  toSQLLimit(): string {
    if (this.first !== null) {
      return `:limit_first`;
    } else {
      return "";
    }
  }

  toSQLParams(): { [p: string]: any } {
    const ret: { [p: string]: any } = {};

    if (this.first !== null) ret["limit_first"] = this.first + 1;
    if (this.after !== null) ret["entity_id_after"] = this.after;

    return ret;
  }

  toSQLOrder(): string {
    return "ORDER BY id ASC";
  }
}
