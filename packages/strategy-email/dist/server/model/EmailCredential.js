import { Credential, DataLoaderExecutor } from "@authx/authx";
import { EmailAuthority } from "./EmailAuthority.js";
export class EmailCredential extends Credential {
    authority(tx) {
        // This explicit check is necessary to work around a TS limitation with
        // unions in overloaded functions.
        if (tx instanceof DataLoaderExecutor) {
            return EmailAuthority.read(tx, this.authorityId);
        }
        return EmailAuthority.read(tx, this.authorityId);
    }
}
//# sourceMappingURL=EmailCredential.js.map