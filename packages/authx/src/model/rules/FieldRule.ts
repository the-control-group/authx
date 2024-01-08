import { Rule } from "./Rule.js";

export class FieldRule extends Rule {
  constructor(
    private fieldName: string,
    private targetValue: number | string | boolean,
  ) {
    super();
  }

  toSQLWhere(): string {
    return `${this.fieldName} = :${this.fieldName}_value`;
  }

  toSQLParams(): { [key: string]: any } {
    const ret: { [key: string]: any } = {};
    ret[`${this.fieldName}_value`] = this.targetValue;
    return ret;
  }
}
