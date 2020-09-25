import { Rule } from "./Rule";
import { ConnectionArguments } from "graphql-relay";
import { ForwardCursorRule } from "./ForwardCursorRule";
import { ReverseCursorRule } from "./ReverseCursorRule";

export class CursorRule {
  static create(args: ConnectionArguments): Rule | null {
    if (typeof args.after === "string" || typeof args.first === "number") {
      return new ForwardCursorRule(args);
    }
    if (typeof args.before === "string" || typeof args.last === "number") {
      return new ReverseCursorRule(args);
    }

    return null;
  }

  static addToRuleListIfNeeded(
    ruleList: Rule[],
    args: ConnectionArguments
  ): Rule[] {
    const cursorRule = this.create(args);
    if (cursorRule) ruleList.push(cursorRule);
    return ruleList;
  }
}
