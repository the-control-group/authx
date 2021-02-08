import { Rule } from "./Rule";
import { extract } from "@authx/scopes";

/**
 * Note that the entity type "authority" is intentionally omitted, because it is
 * always accessible.
 */
type AccessibleEntityType =
  | "authorization"
  | "client"
  | "credential"
  | "grant"
  | "role"
  | "user";

/**
 * Rule that handles pagination if the user is paging backwards through the data
 * Always fetches one extra row from the data source so that the receiver can
 * determine if there is another page.
 *
 * Note that this class only determines if the authorization has the right to see the entity
 * at all. It doesn't check that the user has the right to see any specific fields of the
 * entity, such as secrets or details. It is assumed that the class itself handles that.
 */
export class IsAccessibleByRule extends Rule {
  constructor(
    private readonly realm: string,
    private readonly access: string[],
    private readonly entityType: AccessibleEntityType
  ) {
    super();
  }

  private prepared = false;
  private where = "";
  private params: { [p: string]: any } = {};

  /**
   * Contains a mapping between the fields on scopes and actual DB column names
   * The first level key is the entity name
   * The second level key is the name of the field in the scope
   * The final value is either the column name in the DB in most cases. In these cases the column name will be plugged
   * into the WHERE clause like this "[field name] = [field value]"
   * In some rarer cases it is a subquery. For optimization purposes, the values have to be hoisted into the subquery,
   * so these are implemented as closures. In this case, the query builder will simply call the closure with the value
   * that after parameter substitution contains the value the column must equal.
   * @private
   */
  private static readonly ENTITY_MAPPING_TABLE: {
    [key: string]: { [key: string]: string | ((v: string) => string) };
  } = {
    user: {
      userid: "entity_id",
    },
    authorization: {
      userid: "user_id",
      authorizationid: "entity_id",
      grantid: "grant_id",
      clientid: (it) =>
        `EXISTS(((SELECT 1 FROM authx.grant_record WHERE client_id = ${it} AND entity_id = grant_id AND replacement_record_id IS NULL)))`,
    },
    client: {
      clientid: "entity_id",
    },
    credential: {
      credentialid: "entity_id",
      authorityid: "authority_id",
      userid: "user_id",
    },
    grant: {
      grantid: "entity_id",
      userid: "user_id",
      clientid: "client_id",
    },
    role: {
      roleid: "entity_id",
    },
  };

  private ensurePrepared(): void {
    if (!this.prepared) {
      const template = `${this.realm}:v2.${this.entityType}.(authorityid).(authorizationid).(clientid).(credentialid).(grantid).(roleid).(userid):r....`;

      const fixedIds: { [key: string]: string }[] = [];
      let allAccess = false;

      for (const scope of this.access) {
        const extractedScopes = extract(template, [scope]);

        for (const extracted of extractedScopes) {
          const fixedId: { [key: string]: string } = {};
          let hasAtLeastOneStar = false;
          let scopeInvalidForThisEntityType = false;

          for (const key in extracted.parameters) {
            if (
              typeof IsAccessibleByRule.ENTITY_MAPPING_TABLE[this.entityType][
                key
              ] !== "undefined"
            ) {
              const value = extracted.parameters[key];
              if (value === "*") {
                hasAtLeastOneStar = true;
              } else if (value) {
                fixedId[key] = value;
              } else {
                scopeInvalidForThisEntityType = true;
              }
            } else if (
              extracted.parameters[key].length > 0 &&
              extracted.parameters[key] !== "*"
            ) {
              // This means the scope specified a specific ID, and our entity type doesn't have that ID type at all.
              // This would be for example a fixed UserID being used to fetch a Role.
              scopeInvalidForThisEntityType = true;
            }
          }

          if (scopeInvalidForThisEntityType) continue;

          if (hasAtLeastOneStar && Object.keys(fixedId).length === 0) {
            allAccess = true;
            break;
          } else if (Object.keys(fixedId).length > 0) {
            fixedIds.push(fixedId);
          }
        }
      }

      if (!allAccess && fixedIds.length === 0) {
        // this authorization can't access this entity at all
        this.where = "FALSE";
      } else if (!allAccess) {
        const sqlElements = [];

        for (let i = 0; i < fixedIds.length; ++i) {
          const fixedId = fixedIds[i];
          sqlElements.push(
            "(" +
              Object.keys(fixedId)
                .map((it) => {
                  const mapping =
                    IsAccessibleByRule.ENTITY_MAPPING_TABLE[this.entityType][
                      it
                    ];

                  if (typeof mapping === "string") {
                    return `${mapping} = :acc_list_${i}_${it}`;
                  } else {
                    return mapping(`:acc_list_${i}_${it}`);
                  }
                })
                .join(" AND ") +
              ")"
          );

          for (const key in fixedId) {
            this.params[`acc_list_${i}_${key}`] = fixedId[key];
          }
        }

        this.where = "(" + sqlElements.join(" OR ") + ")";
      }

      this.prepared = true;
    }
  }

  toSQLWhere(): string {
    this.ensurePrepared();

    return this.where;
  }

  toSQLParams(): { [p: string]: any } {
    this.ensurePrepared();

    return this.params;
  }
}
