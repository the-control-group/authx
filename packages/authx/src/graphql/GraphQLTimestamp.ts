import { Kind } from "graphql";
import { GraphQLScalarType } from "graphql";

function serialize(value: unknown): null | number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    return Date.parse(value);
  }

  return null;
}

function parseValue(value: unknown): null | Date {
  try {
    if (typeof value === "string") {
      return new Date(value);
    }

    if (typeof value === "number") {
      return new Date(value);
    }
  } catch (err) {
    return null;
  }

  return null;
}

function parseLiteral(
  ast:
    | { kind: typeof Kind.INT; value: number }
    | { kind: typeof Kind.STRING; value: string }
    | any
): null | Date {
  if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
    return parseValue(ast.value);
  }

  return null;
}

export const GraphQLTimestamp = new GraphQLScalarType({
  name: "Timestamp",
  description:
    "The javascript `Date` as integer. Type represents date and time as number of milliseconds from start of UNIX epoch.",
  serialize,
  parseValue,
  parseLiteral,
});
