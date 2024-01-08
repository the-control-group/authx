import { performance } from "perf_hooks";
import { TooManyRequests } from "../errors.js";

/**
 * Applies a simple in-memory rate limiting scheme. This system is designed to prevent a single
 * malfunctioning client from bringing down the service. This system is only designed to prevent
 * unintentional abuse by malfunctioning clients.
 */
export interface RateLimiter {
  /**
   * Applies the configured rate limit to the given key. If the key is being excessively used, throws a TooManyRequests exception.
   * @param key A string representing the key to use for rate limiting. This is generally the id of an authorization,
   *            client, or credential.
   */
  limit(key: string): void;
}

export class LocalMemoryRateLimiter implements RateLimiter {
  private readonly map: { [key: string]: number[] } = {
    __proto__: null as any,
  };

  constructor(
    private readonly limitPerWindow = 100,
    private readonly window = 60 * 1_000,
    private readonly timeSource: () => number = performance.now,
  ) {}

  limit(key: string): void {
    const currentTime = this.timeSource();

    for (const existingKey of Object.keys(this.map)) {
      for (let i = 0; i < this.map[existingKey].length; ++i) {
        if (currentTime - this.map[existingKey][i] > this.window) {
          this.map[existingKey].splice(i, 1);
          --i;
        }
      }

      if (this.map[existingKey].length == 0) {
        delete this.map[existingKey];
      }
    }

    if (
      typeof this.map[key] !== "undefined" &&
      this.map[key].length >= this.limitPerWindow
    ) {
      throw new TooManyRequests(`Too many requests for key '${key}'.`);
    }

    if (typeof this.map[key] === "undefined") {
      this.map[key] = [];
    }

    this.map[key].push(currentTime);
  }
}

export class NoOpRateLimiter implements RateLimiter {
  limit(): void {
    // This rate limiter does nothing. It only exists so that clients can call some rate limiter.
  }
}
