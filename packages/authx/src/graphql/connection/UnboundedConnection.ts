import { Node } from "./Node";
import { Connection, Edge, PageInfo } from "graphql-relay";
import { CursorConnection } from "./CursorConnection";

export class UnboundedConnection<T extends Node> implements Connection<T> {
  edges: Array<Edge<T>>;
  pageInfo: PageInfo;

  constructor(elements: T[]) {
    this.pageInfo = {};

    this.edges = elements.map(it => {
      return {
        node: it,
        cursor: CursorConnection.toCursor(it.id)
      };
    });
  }
}
