import { Connection, Edge, PageInfo } from "graphql-relay";
import { Node } from "./Node.js";
import { CursorConnection } from "./CursorConnection.js";
import { ForwardCursorRule } from "../../model/rules/ForwardCursorRule.js";

/**
 * Connection class for if the user is using forward pagination
 * Generally this should be used with the ForwardCursorRule, as the FCR
 * handles things like making sure it requests one more than the user
 * requested so we can tell if there's another page.
 */
export class ForwardCursorConnection<T extends Node> implements Connection<T> {
  edges: Array<Edge<T>>;
  pageInfo: PageInfo;

  constructor(elements: T[], cursorRule: ForwardCursorRule) {
    this.pageInfo = {
      startCursor: null,
      endCursor: null,
      hasPreviousPage: false,
      hasNextPage: false,
    };

    elements.sort((a, b) => a.id.localeCompare(b.id));

    if (typeof cursorRule.first === "number") {
      this.pageInfo.hasNextPage = elements.length > cursorRule.first;
      this.pageInfo.hasPreviousPage = false;

      if (elements.length > cursorRule.first) {
        elements = elements.slice(0, cursorRule.first);
      }

      if (elements.length > 0) {
        this.pageInfo.startCursor = CursorConnection.toCursor(elements[0].id);
        this.pageInfo.endCursor = CursorConnection.toCursor(
          elements[elements.length - 1].id,
        );
      }
    }

    this.edges = elements.map((it) => {
      return {
        node: it,
        cursor: CursorConnection.toCursor(it.id),
      };
    });
  }
}
