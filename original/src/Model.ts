import { Client, PoolClient, Pool } from "pg";

export class Model {
  // Static Methods
  // --------------

  static get table() {
    throw new Error("A Model must define a static getter `table`.");
  }

  // get a record by its primary ID
  static async query(conn, transform) {
    if (!transform) transform = q => q;

    var result = await transform(r.table(this.table)).run(conn);
    result = await result.toArray();

    return result.map(record => new this(conn, record));
  }

  // get a record by its primary ID
  static async get(conn, id) {
    var result = await r
      .table(this.table)
      .get(id)
      .run(conn);
    if (!result) throw new errors.NotFoundError();

    return new this(conn, result);
  }

  // update a record by its primary ID
  static async update(conn, id, data) {
    var result = await r
      .table(this.table)
      .get(id)
      .update(data, { returnChanges: "always" })
      .run(conn);

    if (result.errors > 0) throw this.parseRethinkError(result.first_error);

    if (!result.replaced && !result.unchanged) throw new errors.NotFoundError();

    return new this(conn, result.changes[0].new_val);
  }

  // save a record by its primary ID
  static async save(conn, id, data) {
    var result = await r
      .table(this.table)
      .get(id)
      .replace(data, { returnChanges: "always" })
      .run(conn);

    if (result.errors > 0) throw this.parseRethinkError(result.first_error);

    return new this(conn, result.changes[0].new_val);
  }

  // Constructor
  // -----------

  constructor(conn, data) {
    // assign data
    _.assign(this, data);

    // assign the connection
    this[Model.Symbols.CONN] = conn;
  }

  // Methods
  // -------

  // update this model instance
  async update(data) {
    return await this.constructor.update(
      this[Model.Symbols.CONN],
      this.id,
      data
    );
  }

  // delete this model instance{}
  async delete() {
    return await this.constructor.delete(this[Model.Symbols.CONN], this.id);
  }
}
