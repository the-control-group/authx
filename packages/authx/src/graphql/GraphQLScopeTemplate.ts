import {
  GraphQLScalarType,
  GraphQLString,
  GraphQLError,
  ValueNode,
} from "graphql";
import { isValidScopeTemplate } from "@authx/scopes";

export const GraphQLScopeTemplate = new GraphQLScalarType({
  name: "ScopeTemplate",
  description:
    "A ScopeTemplate is a string pattern that represents a set of abilities. In addition to the semantics available in a `Scope`, placeholder segments beginning with `{` and ending with `}` can be used to mark segments with a dynamic value.",
  serialize: (value: unknown) => {
    const string: string = GraphQLString.serialize(value);
    if (!isValidScopeTemplate(string)) {
      throw new GraphQLError(`ScopeTemplate cannot represent value: ${string}`);
    }

    return string;
  },
  parseValue: (value: unknown) => {
    const string = GraphQLString.parseValue(value);
    if (!isValidScopeTemplate(string)) {
      throw new GraphQLError(`ScopeTemplate cannot represent value: ${string}`);
    }

    return string;
  },
  parseLiteral(
    valueNode: ValueNode,
    variables?: null | { [key: string]: any },
  ) {
    const string = GraphQLString.parseLiteral(valueNode, variables);
    if (!isValidScopeTemplate(string)) {
      throw new GraphQLError(`ScopeTemplate cannot represent value: ${string}`);
    }

    return string;
  },
});
