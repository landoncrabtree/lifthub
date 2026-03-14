const isDev = process.env.NODE_ENV === 'development';

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  /** Always logs — server lifecycle, errors, warnings */
  info: (...args: unknown[]) => console.log(`[${timestamp()}] [INFO]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${timestamp()}] [WARN]`, ...args),
  error: (...args: unknown[]) => console.error(`[${timestamp()}] [ERROR]`, ...args),

  /** Only logs when NODE_ENV=development */
  debug: isDev ? (...args: unknown[]) => console.log(`[${timestamp()}] [DEBUG]`, ...args) : () => {},
};
