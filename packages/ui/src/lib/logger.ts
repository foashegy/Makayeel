/**
 * Tiny structured logger. Prints JSON-shaped lines so a future log forwarder
 * (Logtail / Better Stack / Sentry breadcrumbs) can ingest without parsing
 * free-form prose. Drop-in replacement for `console.{info,warn,error}` in
 * the rare places where we want machine-readable output.
 *
 * Usage:
 *   import { logger } from '@makayeel/ui/lib/logger';
 *   logger.info('scrape.started', { siteSlug: 'mazra3ty' });
 *   logger.error('vision.parse_failed', { err: 'invalid json' });
 *
 * In production each line is a single JSON object on stdout — pipe directly
 * to Logtail/Datadog/CloudWatch. In dev (NODE_ENV !== 'production'), pretty-
 * prints with the level + event for readability.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

function emit(level: Level, event: string, fields?: Fields): void {
  const isProd = process.env.NODE_ENV === 'production';
  const payload = {
    level,
    event,
    ts: new Date().toISOString(),
    ...(fields ?? {}),
  };
  if (isProd) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  } else {
    const tag = level === 'error' ? '❌' : level === 'warn' ? '⚠️ ' : level === 'info' ? 'ℹ️ ' : '🔍';
    // eslint-disable-next-line no-console
    console.log(`${tag} ${level.padEnd(5)} ${event}`, fields ?? '');
  }
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit('debug', event, fields),
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),
};
