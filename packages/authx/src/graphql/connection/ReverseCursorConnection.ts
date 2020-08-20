import { Connection, Edge, PageInfo } from "graphql-relay";
import { Node } from "./Node";
import { CursorConnection } from "./CursorConnection";
import { ReverseCursorRule } from "../../model/rules/ReverseCursorRule";

/**
 * Connection class for if the user is using forward pagination
 * Generally this should be used with the ReverseCursorRule, as the RCR
 * handles things like making sure it requests one more than the user
 * requested so we can tell if there's another page.
 */
export class ReverseCursorConnection<T extends Node> implements Connection<T> {
  edges: Array<Edge<T>>;
  pageInfo: PageInfo;

  constructor(elements: T[], cursorRule: ReverseCursorRule) {
    this.pageInfo = {};

    elements.sort((a, b) => -a.id.localeCompare(b.id));

    if (typeof cursorRule.last === "number") {
      this.pageInfo.hasPreviousPage = elements.length > cursorRule.last;
      this.pageInfo.hasNextPage = false;

      if (elements.length > cursorRule.last) {
        elements = elements.slice(0, cursorRule.last);
      }

      if (elements.length > 0) {
        this.pageInfo.startCursor = CursorConnection.toCursor(elements[0].id);
        this.pageInfo.endCursor = CursorConnection.toCursor(
          elements[elements.length - 1].id
        );
      }
    }

    elements = elements.reverse();

    this.edges = elements.map(it => {
      return {
        node: it,
        cursor: CursorConnection.toCursor(it.id)
      };
    });
  }
}
