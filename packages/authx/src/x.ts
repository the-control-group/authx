// Hacked around lack of symbol indexers, see:
// https://github.com/Microsoft/TypeScript/issues/1863
//
// const x: unique symbol = Symbol("@authx/authx");
export const x: "x" = Symbol("@authx/authx") as any;
export default x;
