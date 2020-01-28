import { PoolClient } from "pg";
import { Authority, AuthorityData, Role } from "@authx/authx";
import { SamlCredential } from "./SamlCredential";
import { IdentityProvider, ServiceProvider } from "saml2-js";

// Authority
// ---------

export interface SamlAuthorityDetails {
  identityProviderMetadata: string;
  serviceProviderMetadata: string;

  // privateKeys: string[];
  // certificates: string[];

  // idpLoginUrl: string;
  // idpLogoutUrl: string;
  // idpCertificates: string[];
}

export class SamlAuthority extends Authority<SamlAuthorityDetails> {
  private _credentials: null | Promise<SamlCredential[]> = null;
  private _assignsCreatedUsersToRoles: null | Promise<Role[]> = null;

  public credentials(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<SamlCredential[]> {
    if (!refresh && this._credentials) {
      return this._credentials;
    }

    return (this._credentials = (async () =>
      SamlCredential.read(
        tx,
        (
          await tx.query(
            `
              SELECT entity_id AS id
              FROM authx.credential_records
              WHERE
                authority_id = $1
                AND replacement_record_id IS NULL
              `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async credential(
    tx: PoolClient,
    authorityUserId: string
  ): Promise<null | SamlCredential> {
    const results = await tx.query(
      `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND authority_user_id = $2
        AND enabled = true
        AND replacement_record_id IS NULL
    `,
      [this.id, authorityUserId]
    );

    if (results.rows.length > 1) {
      throw new Error(
        "INVARIANT: There cannot be more than one active credential for the same user and authority."
      );
    }

    if (!results.rows[0]) return null;

    return SamlCredential.read(tx, results.rows[0].id);
  }

  public async loginRequestUrl(base: string): Promise<string> {
    const [privateKey, ...altPrivateKeys] = this.details.privateKeys;
    if (!privateKey) {
      throw new Error("No private key is configured for the SAML authority.");
    }

    const [certificate, ...altCertificates] = this.details.certificates;
    if (!privateKey) {
      throw new Error("No certificate is configured for the SAML authority.");
    }

    const sp = new ServiceProvider({
      /* eslint-disable @typescript-eslint/camelcase */
      entity_id: `${base}?authorityId=${this.id}&metadata`,
      assert_endpoint: `${base}?authorityId=${this.id}`,
      private_key: privateKey,
      certificate: certificate,
      alt_private_keys: altPrivateKeys,
      alt_certs: altCertificates
      /* eslint-enable */
    });

    const idp = new IdentityProvider({
      /* eslint-disable @typescript-eslint/camelcase */
      sso_login_url: this.details.idpLoginUrl,
      sso_logout_url: this.details.idpLogoutUrl,
      certificates: this.details.idpCertificates
      /* eslint-enable */
    });

    return new Promise((resolve, reject) => {
      sp.create_login_request_url(idp, {}, function(error, loginUrl) {
        if (error) return reject(error);
        resolve(loginUrl);
      });
    });
  }

  public async getAssertion(base: string): Promise<{ id: string }> {
    const sp = new ServiceProvider({
      /* eslint-disable @typescript-eslint/camelcase */
      entity_id: `${base}?authorityId=${this.id}&metadata`,
      assert_endpoint: `${base}?authorityId=${this.id}`,
      private_key: privateKey,
      certificate: certificate,
      alt_private_keys: altPrivateKeys,
      alt_certs: altCertificates
      /* eslint-enable */
    });

    const idp = new IdentityProvider({
      /* eslint-disable @typescript-eslint/camelcase */
      sso_login_url: this.details.idpLoginUrl,
      sso_logout_url: this.details.idpLogoutUrl,
      certificates: this.details.idpCertificates
      /* eslint-enable */
    });

    return new Promise((resolve, reject) => {
      sp.post_assert(
        idp,
        {
          request_body
        },
        function(error, loginUrl) {
          if (error) return reject(error);
          resolve(loginUrl);
        }
      );
    });
  }
}
