import { Authority, DataLoaderExecutor, QueryCache } from "@authx/authx";
import { EmailCredential } from "./EmailCredential.js";
export class EmailAuthority extends Authority {
    async credentials(tx) {
        const ids = (await queryCache.query(tx, `
          SELECT entity_id AS id
          FROM authx.credential_records
          WHERE
            authority_id = $1
            AND replacement_record_id IS NULL
          ORDER BY id ASC
          `, [this.id])).rows.map(({ id }) => id);
        // This explicit check is necessary to work around a TS limitation with
        // unions in overloaded functions.
        if (tx instanceof DataLoaderExecutor) {
            return EmailCredential.read(tx, ids);
        }
        return EmailCredential.read(tx, ids);
    }
    async credential(tx, authorityUserId) {
        const results = await queryCache.query(tx, `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND authority_user_id = $2
        AND enabled = true
        AND replacement_record_id IS NULL
      `, [this.id, authorityUserId]);
        if (results.rows.length > 1) {
            throw new Error("INVARIANT: There cannot be more than one active credential for the same user and authority.");
        }
        if (!results.rows[0])
            return null;
        // This explicit check is necessary to work around a TS limitation with
        // unions in overloaded functions.
        if (tx instanceof DataLoaderExecutor) {
            return EmailCredential.read(tx, results.rows[0].id);
        }
        return EmailCredential.read(tx, results.rows[0].id);
    }
}
const queryCache = new QueryCache();
//# sourceMappingURL=EmailAuthority.js.map