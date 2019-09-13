export interface Config {
  readonly realm: string;
  readonly authxUrl: string;
}

export function assertConfig(config: Config): void {
  if (typeof config.realm !== "string") {
    throw new Error("The config option `realm` must be a string.");
  }

  if (typeof config.authxUrl !== "string")
    throw new Error("The config option `authxUrl` must be a string.");
}
