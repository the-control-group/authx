import { Authority, DataLoaderExecutor, QueryCache } from "@authx/authx";
import { ClientBase, Pool } from "pg";
import { SamlCredential } from "./SamlCredential.js";
import { AuthorityData } from "@authx/authx";
import { IdentityProvider, ServiceProvider } from "saml2-js";
import { Role } from "@authx/authx";

export interface SamlAuthorityDetails {
  entityId: string;
  serviceProviderPrivateKey: string;
  serviceProviderCertificate: string;

  emailAuthorityId: null | string;

  authUrl: string;
  identityProviderCertificates: string[];

  matchesUsersByEmail: boolean;
  createsUnmatchedUsers: boolean;
  assignsCreatedUsersToRoleIds: string[];
}

export class SamlAuthority extends Authority<SamlAuthorityDetails> {
  public readonly identityProvider: IdentityProvider;

  public constructor(
    data: AuthorityData<SamlAuthorityDetails> & { readonly recordId: string },
  ) {
    super(data);

    this.identityProvider = new IdentityProvider({
      sso_login_url: data.details.authUrl,
      sso_logout_url: "",
      certificates: data.details.identityProviderCertificates,
      force_authn: false,
      sign_get_request: true,
      allow_unencrypted_assertion: true,
    });
  }

  assertEndpoint(base: string): string {
    return `${base}strategy/saml/${this.id}/assert`;
  }

  serviceProvider(base: string): ServiceProvider {
    return new ServiceProvider({
      entity_id: this.details.entityId,
      private_key: this.details.serviceProviderPrivateKey,
      certificate: this.details.serviceProviderCertificate,
      assert_endpoint: this.assertEndpoint(base),
      force_authn: false,
      nameid_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
      sign_get_request: true,
      allow_unencrypted_assertion: true,
    });
  }

  async credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<SamlCredential[]> {
    const ids = (
      await queryCache.query(
        tx,
        `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND enabled = true
        AND replacement_record_id IS NULL
      `,
        [this.id],
      )
    ).rows.map(({ id }) => id);

    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return (await SamlCredential.read(tx, ids)) as SamlCredential[];
    }

    return (await SamlCredential.read(tx, ids)) as SamlCredential[];
  }

  public async credential(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorityUserId: string,
  ): Promise<null | SamlCredential> {
    const results = await queryCache.query(
      tx,
      `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND authority_user_id = $2
        AND enabled = true
        AND replacement_record_id IS NULL
      `,
      [this.id, authorityUserId],
    );

    if (results.rows.length > 1) {
      throw new Error(
        "INVARIANT: There cannot be more than one active credential for the same user and authority.",
      );
    }

    if (!results.rows[0]) return null;

    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return (await SamlCredential.read(
        tx,
        results.rows[0].id,
      )) as SamlCredential;
    }

    return (await SamlCredential.read(
      tx,
      results.rows[0].id,
    )) as SamlCredential;
  }

  public async assignsCreatedUsersToRoles(
    tx: DataLoaderExecutor,
  ): Promise<Role[]> {
    if (!this.details.assignsCreatedUsersToRoleIds) {
      return [];
    }

    return Role.read(tx, this.details.assignsCreatedUsersToRoleIds);
  }
}

const queryCache = new QueryCache<{ id: string }>();
