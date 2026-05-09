import { env } from '../config/env';

type LogLevelName = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_RANK: Record<Exclude<LogLevelName, 'silent'>, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function normalizeLevel(raw: string | undefined): LogLevelName {
  const v = (raw ?? 'info').trim().toLowerCase();
  if (v === 'silent' || v === 'error' || v === 'warn' || v === 'info' || v === 'debug') {
    return v;
  }
  return 'info';
}

function activeLevel(): LogLevelName {
  return normalizeLevel(env.logLevel);
}

function enabled(forLevel: keyof typeof LEVEL_RANK): boolean {
  const level = activeLevel();
  /** `silent` still allows errors so failures are visible with minimal noise. */
  if (level === 'silent') {
    return forLevel === 'error';
  }
  return LEVEL_RANK[forLevel] <= LEVEL_RANK[level];
}

/**
 * Small structured logger for Playwright runs and setup scripts.
 *
 * Control verbosity with `LOG_LEVEL`: `silent` (errors only) | `error` | `warn` | `info` | `debug` (default `info`).
 */
export class Logger {
  constructor(private readonly scope?: string) {}

  private prefix(level: string): string {
    const scope = this.scope ? `[${this.scope}] ` : '';
    return `[${level}] ${scope}`;
  }

  private formatMeta(meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) {
      return '';
    }
    return ` ${JSON.stringify(meta)}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (!enabled('debug')) {
      return;
    }
    console.log(`${this.prefix('DEBUG')}${message}${this.formatMeta(meta)}`);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (!enabled('info')) {
      return;
    }
    console.log(`${this.prefix('INFO')}${message}${this.formatMeta(meta)}`);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (!enabled('warn')) {
      return;
    }
    console.warn(`${this.prefix('WARN')}${message}${this.formatMeta(meta)}`);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (!enabled('error')) {
      return;
    }
    console.error(`${this.prefix('ERROR')}${message}${this.formatMeta(meta)}`);
  }
}

/** Default logger (no scope). */
export const logger = new Logger();

/** Scoped logger, e.g. `createLogger('EmployeesApi')`. */
export function createLogger(scope: string): Logger {
  return new Logger(scope);
}
