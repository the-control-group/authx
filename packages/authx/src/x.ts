// Hacked around lack of symbol indexers, see:
// https://github.com/Microsoft/TypeScript/issues/1863
//
// const x: unique symbol = Symbol("AuthX");
export const x: "x" = Symbol("AuthX") as any;
export default x;
