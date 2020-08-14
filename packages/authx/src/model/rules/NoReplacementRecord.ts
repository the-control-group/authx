import { Rule } from "./Rule";

export class NoReplacementRecord extends Rule {
  toSQLWhere(): string {
    return "replacement_record_id IS NULL";
  }
}
