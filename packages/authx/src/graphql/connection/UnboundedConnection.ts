import { Node } from "./Node.js";
import { Connection, Edge, PageInfo } from "graphql-relay";
import { CursorConnection } from "./CursorConnection.js";

export class UnboundedConnection<T extends Node> implements Connection<T> {
  edges: Array<Edge<T>>;
  pageInfo: PageInfo;

  constructor(elements: T[]) {
    this.pageInfo = {
      startCursor: null,
      endCursor: null,
      hasPreviousPage: false,
      hasNextPage: false,
    };

    this.pageInfo.hasNextPage = false;
    this.pageInfo.hasPreviousPage = false;
    if (elements.length > 0) {
      this.pageInfo.startCursor = CursorConnection.toCursor(elements[0].id);
      this.pageInfo.endCursor = CursorConnection.toCursor(
        elements[elements.length - 1].id
      );
    }

    this.edges = elements.map((it) => {
      return {
        node: it,
        cursor: CursorConnection.toCursor(it.id),
      };
    });
  }
}
