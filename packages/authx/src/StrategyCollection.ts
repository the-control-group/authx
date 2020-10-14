import { Context } from "./Context";
import { Strategy } from "./Strategy";
import { GraphQLFieldConfig, GraphQLNamedType } from "graphql";
import { Authority, AuthorityData, Credential, CredentialData } from "./model";

export class StrategyCollection {
  public map: { [name: string]: Strategy } = {};

  public authorityMap: {
    readonly [name: string]: {
      new (data: AuthorityData<any> & { readonly recordId: string }): Authority<
        any
      >;
    };
  } = {};

  public credentialMap: {
    readonly [name: string]: {
      new (
        data: CredentialData<any> & { readonly recordId: string }
      ): Credential<any>;
    };
  } = {};

  public queryFields: {
    readonly [field: string]: GraphQLFieldConfig<any, Context, any>;
  } = {};

  public mutationFields: {
    readonly [field: string]: GraphQLFieldConfig<any, Context, any>;
  } = {};

  public types: GraphQLNamedType[] = [];

  public constructor(strategies?: Iterable<Strategy>) {
    if (strategies) {
      for (const strategy of strategies) {
        this.add(strategy);
      }
    }
  }

  public add(s: Strategy): StrategyCollection {
    if (this.map[s.name])
      throw new Error(
        `INVARIANT: Multiple strategies cannot use the same identifier; "${s.name}" is used twice.`
      );

    const queryFields = { ...this.queryFields };
    for (const f of Object.keys(s.queryFields)) {
      if (queryFields[f]) {
        throw new Error(
          `INVARIANT: Multiple strategies cannot use the query field; "${f}" is used twice.`
        );
      }

      queryFields[f] = s.queryFields[f];
    }

    const mutationFields = { ...this.mutationFields };
    for (const f of Object.keys(s.mutationFields)) {
      if (mutationFields[f]) {
        throw new Error(
          `INVARIANT: Multiple strategies cannot use the mutation field; "${f}" is used twice.`
        );
      }

      mutationFields[f] = s.mutationFields[f];
    }

    this.map = { ...this.map, [s.name]: s };
    this.authorityMap = { ...this.authorityMap, [s.name]: s.authorityModel };
    this.credentialMap = { ...this.credentialMap, [s.name]: s.credentialModel };
    this.queryFields = queryFields;
    this.mutationFields = mutationFields;
    this.types = [...this.types, ...s.types];

    return this;
  }

  public delete(s: Strategy): boolean {
    if (!this.map[s.name]) return false;

    const map = { ...this.map };
    delete map[s.name];

    const authorityMap = { ...this.authorityMap };
    delete authorityMap[s.name];

    const credentialMap = { ...this.credentialMap };
    delete credentialMap[s.name];

    const queryFields = { ...this.queryFields };
    for (const f of Object.keys(s.queryFields)) {
      delete queryFields[f];
    }

    const mutationFields = { ...this.mutationFields };
    for (const f of Object.keys(s.mutationFields)) {
      delete mutationFields[f];
    }

    this.map = map;
    this.authorityMap = authorityMap;
    this.credentialMap = credentialMap;
    this.queryFields = queryFields;
    this.mutationFields = mutationFields;
    this.types = this.types.filter((t) => !s.types.includes(t));

    return true;
  }
}
