export async function filter<T>(
  iter: Iterable<T>,
  callback: (item: T, index: number) => boolean | Promise<boolean>
): Promise<T[]> {
  const result: T[] = [];
  await Promise.all(
    [...iter].map(async (item: T, index: number) => {
      if (await callback(item, index)) result.push(item);
    })
  );

  return result;
}
