import { loader } from "webpack";

export default function(
  this: loader.LoaderContext,
  source: string | Buffer
): string {
  const strategies: ReadonlyArray<string> =
    (this.query && this.query.strategies) || [];
  source = typeof source === "string" ? source : source.toString();
  return source.replace(
    "__STRATEGIES__",
    `[${strategies
      .map(s => `require(${JSON.stringify(s)}).default`)
      .join(", ")}]`
  );
}
