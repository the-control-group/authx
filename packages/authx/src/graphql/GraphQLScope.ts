import {
  GraphQLScalarType,
  GraphQLString,
  GraphQLError,
  ValueNode
} from "graphql";
import { isValidScope } from "@authx/scopes";

export const GraphQLScope = new GraphQLScalarType({
  name: "Scope",
  description: "A Scope is a string pattern representing a set of abilities.",
  serialize: (value: unknown) => {
    const string: string = GraphQLString.serialize(value);
    if (!isValidScope(string)) {
      throw new GraphQLError(`Scope cannot represent value: ${string}`);
    }

    return string;
  },
  parseValue: (value: unknown) => {
    const string = GraphQLString.parseValue(value);
    if (!isValidScope(string)) {
      throw new GraphQLError(`Scope cannot represent value: ${string}`);
    }

    return string;
  },
  parseLiteral(
    valueNode: ValueNode,
    variables?: null | { [key: string]: any }
  ) {
    const string = GraphQLString.parseLiteral(valueNode, variables);
    if (!isValidScope(string)) {
      throw new GraphQLError(`Scope cannot represent value: ${string}`);
    }

    return string;
  }
});
