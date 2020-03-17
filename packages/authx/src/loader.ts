import { Pool, ClientBase } from "pg";
import DataLoader from "dataloader";
import { NotFoundError } from "./errors";

type Model = {
	readonly id: string;
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

export class DataLoaderCache<
	M extends Model,
	A extends any[],
	C extends {
		read(
			tx: Pool | ClientBase,
			id: readonly string[],
			...args: A
		): Promise<M[]>;
	}
> extends WeakMap<DataLoaderCacheKey, DataLoader<string, M>> {
	private readonly _model: C;
	private readonly _args: A;

	constructor(model: C, ...args: A) {
		super();
		this._model = model;
		this._args = args;
	}

	get(executor: DataLoaderExecutor): DataLoader<string, M> {
		let loader = super.get(executor.key);
		if (loader) {
			return loader;
		}

		const model = this._model;
		const args = this._args;
		loader = new DataLoader<string, M>(async function(
			ids: readonly string[]
		): Promise<(M | Error)[]> {
			// Get the results from the model in whatever order the database found
			// most efficient.
			const results = await model.read(executor.tx, ids, ...args);

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
		this.set(executor.key, loader);
		return loader;
	}
}
