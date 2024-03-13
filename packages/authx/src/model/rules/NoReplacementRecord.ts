import { Rule } from "./Rule.js";

export class NoReplacementRecord extends Rule {
  toSQLWhere(): string {
    return "replacement_record_id IS NULL";
  }
}
