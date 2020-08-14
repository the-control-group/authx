import { Connection, Edge, PageInfo } from "graphql-relay";
import { EntityWithID } from "./EntityWithID";
import { CursorConnection } from "./CursorConnection";
import { ForwardCursorRule } from "../../model/rules/ForwardCursorRule";

/**
 * Connection class for if the user is using forward pagination
 * Generally this should be used with the ForwardCursorRule, as the FCR
 * handles things like making sure it requests one more than the user
 * requested so we can tell if there's another page.
 */
export class ForwardCursorConnection<T extends EntityWithID>
  implements Connection<T> {
  edges: Array<Edge<T>>;
  pageInfo: PageInfo;

  constructor(elements: T[], cursorRule: ForwardCursorRule) {
    this.pageInfo = {};

    elements.sort((a, b) => a.id.localeCompare(b.id));

    if (typeof cursorRule.first === "number") {
      this.pageInfo.hasNextPage = elements.length > cursorRule.first;

      if (elements.length > cursorRule.first) {
        elements = elements.slice(0, cursorRule.first);
      }
    }

    this.edges = elements.map(it => {
      return {
        node: it,
        cursor: CursorConnection.toCursor(it.id)
      };
    });
  }
}
