import { ClientBase, Pool } from "pg";
import { DataLoaderExecutor } from "./loader.js";
import { Authorization, AuthorizationInvocation } from "./model/index.js";

export interface InvocationRecorder {
  /**
   * Queues an authorization invocation for persistence to the database.
   * Returns a promise that resolves to an authorization invocation. Note that this
   * authorization invocation is simply queued, and may not yet be in the database.
   * @param tx A transaction that the invocation recorder may use to store the invocation in the database. The recorder may
   *   or may not use this transaction.
   * @param data
   */
  queueAuthorizationInvocation(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorization: Authorization,
    data: {
      id: string;
      format: string;
      createdAt: Date;
    },
  ): Promise<AuthorizationInvocation>;
}

export class EagerInvocationRecorder implements InvocationRecorder {
  async queueAuthorizationInvocation(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorization: Authorization,
    data: {
      id: string;
      format: string;
      createdAt: Date;
    },
  ): Promise<AuthorizationInvocation> {
    return await authorization.invoke(tx, data);
  }
}
