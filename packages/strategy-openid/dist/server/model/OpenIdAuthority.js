import { Authority, Role, DataLoaderExecutor, QueryCache } from "@authx/authx";
import { EmailAuthority } from "@authx/strategy-email";
import { OpenIdCredential } from "./OpenIdCredential.js";
export class OpenIdAuthority extends Authority {
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
            return OpenIdCredential.read(tx, ids);
        }
        return OpenIdCredential.read(tx, ids);
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
            return OpenIdCredential.read(tx, results.rows[0].id);
        }
        return OpenIdCredential.read(tx, results.rows[0].id);
    }
    async emailAuthority(tx) {
        if (!this.details.emailAuthorityId) {
            return null;
        }
        return EmailAuthority.read(tx, this.details.emailAuthorityId);
    }
    async assignsCreatedUsersToRoles(tx) {
        if (!this.details.assignsCreatedUsersToRoleIds) {
            return [];
        }
        // This explicit check is necessary to work around a TS limitation with
        // unions in overloaded functions.
        if (tx instanceof DataLoaderExecutor) {
            return Role.read(tx, this.details.assignsCreatedUsersToRoleIds);
        }
        return Role.read(tx, this.details.assignsCreatedUsersToRoleIds);
    }
}
const queryCache = new QueryCache();
//# sourceMappingURL=OpenIdAuthority.js.map