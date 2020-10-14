import { Node } from "./Node";
import { Connection, ConnectionArguments } from "graphql-relay";
import { ForwardCursorConnection } from "./ForwardCursorConnection";
import { ReverseCursorConnection } from "./ReverseCursorConnection";
import { UnboundedConnection } from "./UnboundedConnection";
import { Rule } from "../../model/rules/Rule";
import { ForwardCursorRule } from "../../model/rules/ForwardCursorRule";
import { ReverseCursorRule } from "../../model/rules/ReverseCursorRule";

export class CursorConnection {
  static toCursor(id: string): string {
    return Buffer.from(`id:${id}`, "ascii").toString("base64");
  }

  static fromCursor(cursor: string): string {
    const parts = Buffer.from(cursor, "base64").toString("ascii").split(":");
    return parts[1];
  }

  /**
   * Creates a connection from a list of rules and a list of entities
   * This function is coupled with the *CursorRules in that the cursor rules
   * request one extra entity so the returned connections can determine if
   * there is another page.
   * @param args
   * @param elements
   * @param rules
   */
  static connectionFromRules<T extends Node>(
    args: ConnectionArguments,
    elements: T[],
    rules: Rule[]
  ): Connection<T> {
    const forwardCursorRule = rules.find(
      (it) => it instanceof ForwardCursorRule
    ) as ForwardCursorRule | undefined;

    const reverseCursorRule = rules.find(
      (it) => it instanceof ReverseCursorRule
    ) as ReverseCursorRule | undefined;

    if (forwardCursorRule) {
      return new ForwardCursorConnection(elements, forwardCursorRule);
    } else if (reverseCursorRule) {
      return new ReverseCursorConnection(elements, reverseCursorRule);
    } else {
      // there was no pagination, so the entire list is here
      return new UnboundedConnection(elements);
    }
  }
}
