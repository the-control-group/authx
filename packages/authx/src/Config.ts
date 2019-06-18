import { GraphQLSchema } from "graphql";
import { StrategyCollection } from "./StrategyCollection";
import { Strategy } from "./Strategy";

export interface Config {
  readonly realm: string;
  readonly base: string;
  readonly privateKey: string;
  readonly publicKeys: string[];
  readonly codeValidityDuration: number;
  readonly jwtValidityDuration: number;
  readonly strategies: StrategyCollection | Strategy[];
  readonly pg: {
    readonly database?: string;
    readonly host?: string;
    readonly idleTimeoutMillis?: number;
    readonly max?: number;
    readonly password?: string;
    readonly port?: number;
    readonly ssl?: boolean;
    readonly user?: string;
  };
  readonly sendMail: (options: {
    readonly to: string;
    readonly subject: string;
    readonly text: string;
    readonly html: string;
    readonly from?: string;
  }) => Promise<any>;
  readonly processSchema?: (schema: GraphQLSchema) => GraphQLSchema;
}

export function assertConfig(config: Config): void {
  if (typeof config.realm !== "string") {
    throw new Error("The config option `realm` must be a string.");
  }

  if (typeof config.base !== "string")
    throw new Error("The config option `base` must be a string.");

  if (typeof config.codeValidityDuration !== "number") {
    throw new Error(
      "The config option `codeValidityDuration` must be a number."
    );
  }

  if (typeof config.jwtValidityDuration !== "number") {
    throw new Error(
      "The config option `jwtValidityDuration` must be a number."
    );
  }

  if (typeof config.privateKey !== "string") {
    throw new Error("The config option `privateKey` must be a string.");
  }

  if (!Array.isArray(config.publicKeys)) {
    throw new Error("The config option `publicKeys` must be an array.");
  }

  if (config.publicKeys.some((key): boolean => typeof key !== "string")) {
    throw new Error(
      "The config option `publicKeys` must only include strings."
    );
  }

  if (!config.publicKeys.length) {
    throw new Error(
      "The config option `publicKeys` must include at least one key."
    );
  }

  if (typeof config.sendMail !== "function") {
    throw new Error("The config option `sendMail` must be a function.");
  }

  if (
    !(config.strategies instanceof StrategyCollection) &&
    !Array.isArray(config.strategies)
  ) {
    throw new Error(
      "The config option `strategies` must either be an instance of `StrategyCollection` or an array of `Strategy` instances."
    );
  }

  if (typeof config.pg !== "object") {
    throw new Error("The config option `pg` must be an object.");
  }

  if (
    typeof config.processSchema !== "undefined" &&
    typeof config.processSchema !== "function"
  ) {
    throw new Error(
      "The config option `processSchema` must be a function if defined."
    );
  }
}
