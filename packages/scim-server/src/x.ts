// Hacked around lack of symbol indexers, see:
// https://github.com/Microsoft/TypeScript/issues/1863
//
// const x: unique symbol = Symbol("@authx/scim-server");
export const x: "x" = Symbol("@authx/scim-server") as any;
export default x;
