import { Authority, Credential } from "./models";
import { GraphQLObjectType } from "graphql";

export interface Strategy<A extends Authority<any>, C extends Credential<any>> {
  Authority: A;
  Credential: C;
  GraphQLAuthority: GraphQLObjectType;
  GraphQLCredential: GraphQLObjectType;
}
