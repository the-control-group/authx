import { EventEmitter } from "events";
import fetch, { AbortError } from "node-fetch";

interface Config {
  /**
   * The root URL to AuthX server.
   */
  readonly authxUrl: string;

  /**
   * The number of seconds between successful attempts at refreshing public keys
   * from the AuthX server.
   *
   * @defaultValue `60`
   */
  readonly authxPublicKeyRefreshInterval?: number;

  /**
   * The number of seconds to wait before aborting and retrying a request for
   * public keys from the AuthX server.
   *
   * @defaultValue `30`
   */
  readonly authxPublicKeyRefreshRequestTimeout?: number;

  /**
   * The number of seconds between failed attempts at refreshing public keys
   * from the AuthX server.
   *
   * @defaultValue `10`
   */
  readonly authxPublicKeyRetryInterval?: number;
}

export class AuthXKeyCache extends EventEmitter {
  private readonly _config: Config;
  private _fetchTimeout: null | ReturnType<typeof setTimeout> = null;
  private _fetchAbortController: null | AbortController = null;
  private _fetchAbortTimeout: null | ReturnType<typeof setTimeout> = null;
  public active: boolean = false;
  public keys: null | ReadonlyArray<string> = null;

  public constructor(config: Config) {
    super();
    this._config = config;
  }

  protected _fetch = async (): Promise<void> => {
    this._fetchTimeout = null;

    // Don't fetch unless the cache is active.
    if (!this.active) {
      return;
    }

    this._fetchAbortController = new AbortController();
    this._fetchAbortTimeout = setTimeout(() => {
      if (this._fetchAbortController) {
        this._fetchAbortController.abort();
      }
    }, (this._config.authxPublicKeyRefreshRequestTimeout || 30) * 1000);

    try {
      // Fetch the keys from AuthX.
      const response = await (
        await fetch(this._config.authxUrl + "/graphql", {
          signal: this._fetchAbortController.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"query": "query { keys }"}',
        })
      ).json();

      if (typeof response !== "object" || response === null) { 
        throw new Error("The response from AuthX is not an object.");
      }

      // Make sure we don't have any errors.
      if ('errors' in response && response.errors && Array.isArray(response.errors) && response.errors[0])
        throw new Error(response.errors[0]);

      if ( !('data' in response) || response.data === null || typeof response.data !== "object" || !('keys' in response.data) || !Array.isArray(response.data.keys) ) {
        throw new Error("The response from AuthX is missing keys.");
      }

      const keys: string[] = response.data.keys;

      // Ensure that there is at least one valid key in the response.
      if (
        !keys ||
        !Array.isArray(keys) ||
        !keys.length ||
        !keys.every((k) => typeof k === "string")
      ) {
        throw new Error("An array of least one key must be returned by AuthX.");
      }

      if (!this.active) {
        return;
      }

      // Cache the keys.
      this.keys = keys;

      // Fire off a ready event.
      this.emit("ready");

      // Fetch again in 1 minute.
      if (this.active && !this._fetchTimeout){
        this._fetchTimeout = setTimeout(
          this._fetch,
          (this._config.authxPublicKeyRefreshInterval || 60) * 1000
        );
      }
    } catch (error) {
      this.emit("error", error);
      
      // Fetch again in 10 seconds.
      if (!(error instanceof AbortError) && this.active && !this._fetchTimeout) {
        this._fetchTimeout = setTimeout(
          this._fetch,
          (this._config.authxPublicKeyRetryInterval || 10) * 1000
        );
      }
    } finally {
      this._fetchAbortController = null;
      clearTimeout(this._fetchAbortTimeout);
      this._fetchAbortTimeout = null;
    }
  };

  public start(): void {
    if (this.active) return;

    this.active = true;
    this._fetch();
  }

  public stop(): void {
    if (!this.active) return;

    this.active = false;

    // Clear any pending timeouts.
    const timeout = this._fetchTimeout;
    if (timeout) {
      clearTimeout(timeout);
    }

    const abortTimeout = this._fetchAbortTimeout;
    if (abortTimeout) {
      clearTimeout(abortTimeout);
    }

    // Abort any in-flight key requests.
    const abort = this._fetchAbortController;
    if (abort) {
      abort.abort();
    }

    this.keys = null;
  }
}
