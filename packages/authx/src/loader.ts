import { Pool, ClientBase } from "pg";
import DataLoader from "dataloader";
import { NotFoundError } from "./errors";
import { StrategyCollection } from "./StrategyCollection";

type Model = {
	readonly id: string;
};

export class DataLoaderContext {
	readonly strategies: StrategyCollection;
	constructor(strategies: StrategyCollection) {
		this.strategies = strategies;
	}
}

export class DataLoaderExecutor {
	public readonly connection: ClientBase | Pool;
	public readonly context: DataLoaderContext;

	constructor(connection: ClientBase | Pool, context: DataLoaderContext) {
		this.connection = connection;
		this.context = context;
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
> {
	private _map: WeakMap<DataLoaderContext, DataLoader<string, M>>;
	private readonly _model: C;
	private readonly _args: A;

	constructor(model: C, ...args: A) {
		this._map = new WeakMap();
		this._model = model;
		this._args = args;
	}

	get(executor: DataLoaderExecutor): DataLoader<string, M> {
		let loader = this._map.get(executor.context);
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
			const results = await model.read(executor.connection, ids, ...args);

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
		this._map.set(executor.context, loader);
		return loader;
	}
}
