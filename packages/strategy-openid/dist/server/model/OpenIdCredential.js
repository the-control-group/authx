import { Credential, DataLoaderExecutor } from "@authx/authx";
import { OpenIdAuthority } from "./OpenIdAuthority.js";
export class OpenIdCredential extends Credential {
    authority(tx) {
        // This explicit check is necessary to work around a TS limitation with
        // unions in overloaded functions.
        if (tx instanceof DataLoaderExecutor) {
            return OpenIdAuthority.read(tx, this.authorityId);
        }
        return OpenIdAuthority.read(tx, this.authorityId);
    }
}
//# sourceMappingURL=OpenIdCredential.js.map