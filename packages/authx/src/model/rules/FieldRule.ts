import { Rule } from "./Rule";

export class FieldRule extends Rule {
  constructor(private fieldName: string, private targetValue: number | string) {
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
