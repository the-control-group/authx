import { Pool, ClientBase } from "pg";
import DataLoader from "dataloader";
import { NotFoundError } from "./errors";
import { StrategyCollection } from "./StrategyCollection";

export class DataLoaderExecutor<
	T extends ClientBase | Pool = ClientBase | Pool
> {
	public connection: T;
	public readonly strategies: StrategyCollection;

	constructor(connection: T, strategies: StrategyCollection) {
		this.connection = connection;
		this.strategies = strategies;
	}
}

export type ReadonlyDataLoaderExecutor<
	T extends ClientBase | Pool = ClientBase | Pool
> = DataLoaderExecutor<T> & {
	readonly connection: T;
};

export type Reader<M> = (
	executor: DataLoaderExecutor,
	ids: readonly string[]
) => Promise<M[]>;

export class DataLoaderCache<M extends { id: string }> {
	private _map: WeakMap<DataLoaderExecutor, DataLoader<string, M>>;
	private readonly _read: Reader<M>;

	constructor(read: Reader<M>) {
		this._map = new WeakMap();
		this._read = read;
	}

	get(executor: DataLoaderExecutor): DataLoader<string, M> {
		let loader = this._map.get(executor);
		if (loader) {
			return loader;
		}

		const read = this._read;
		loader = new DataLoader<string, M>(async function(
			ids: readonly string[]
		): Promise<(M | Error)[]> {
			// Get the results from the read in whatever order the database found
			// most efficient.
			const results = await read(executor, ids);

			// Index the results by ID.
			const resultsById = new Map<string, M>();
			for (let i = 0; i < results.length; i++) {
				const result = results[i];
				resultsById.set(result.id, result);
			}

			// Normalize the order and format to comply with the DataLoader interface.
			const returnValue = new Array(ids.length);
			for (let i = 0; i < ids.length; i++) {
				const id = ids[i];
				returnValue[i] = resultsById.get(id) ?? new NotFoundError();
			}

			return returnValue;
		});
		this._map.set(executor, loader);
		return loader;
	}
}
