/**
 * Structured JSON logs, one object per line, with the request ID
 * on every line (docs/architecture.md, Backend). Never log secrets or personal data.
 */
export type LogFields = Record<string, unknown>;

export type Logger = {
  info(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
};

export function createLogger(context: LogFields): Logger {
  const write = (level: 'info' | 'error', message: string, fields: LogFields = {}) => {
    const line = JSON.stringify({ level, message, ...context, ...fields });
    if (level === 'error') console.error(line);
    else console.log(line);
  };
  return {
    info: (message, fields) => write('info', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}
