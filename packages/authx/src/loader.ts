import { Pool, ClientBase } from "pg";
import DataLoader from "dataloader";
import { NotFoundError } from "./errors";

type Model = {
	readonly id: string;
};

type ModelConstructor<T extends Model> = (new (data: any) => T) & {
	read(
		tx: Pool | ClientBase,
		id: readonly string[],
		options?: {}
	): Promise<T[]>;
};

export class DataLoaderCacheKey {}

export class DataLoaderExecutor {
	public readonly tx: ClientBase | Pool;
	public readonly key: DataLoaderCacheKey;

	constructor(tx: ClientBase | Pool, key = new DataLoaderCacheKey()) {
		this.tx = tx;
		this.key = key;
	}
}

export type Queriable = ClientBase | Pool | DataLoaderExecutor;

export class DataLoaderCache<T extends Model> extends WeakMap<
	DataLoaderCacheKey,
	DataLoader<string, T>
> {
	private readonly _model: ModelConstructor<T>;

	constructor(model: ModelConstructor<T>) {
		super();
		this._model = model;
	}

	get(executor: DataLoaderExecutor): DataLoader<string, T> {
		let loader = super.get(executor.key);
		if (loader) {
			return loader;
		}

		const model = this._model;
		loader = new DataLoader<string, T>(async function(
			ids: readonly string[]
		): Promise<(T | Error)[]> {
			// Get the results from the model in whatever order the database found
			// most efficient.
			const results = await model.read(executor.tx, ids);

			// Index the results by ID.
			const resultsById = new Map<string, T>();
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
		this.set(executor.key, loader);
		return loader;
	}
}
