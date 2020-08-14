const EMPTY: unique symbol = Symbol("empty");
export async function filter<T>(
  iter: Iterable<T>,
  callback: (item: T, index: number) => boolean | Promise<boolean>
): Promise<T[]> {
  const array = [...iter];

  // Use our unique symbol to distinguish between an intentionally "undefined"
  // value and a truly omitted one.
  const result: (T | typeof EMPTY)[] = new Array(array.length).fill(EMPTY);
  await Promise.all(
    array.map(async (item: T, index: number) => {
      if (await callback(item, index)) result[index] = item;
    })
  );

  return result.filter((r): r is T => r !== EMPTY);
}
