/* eslint import/prefer-default-export: off */
import path from 'path';
import url from 'url';

export function resolveHtmlPath(htmlFileName: string, hash: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    return `http://localhost:${port}#/${hash}`;
  }

  const pathUrl = url.format({
    pathname: path.resolve(__dirname, '../renderer/', `${htmlFileName}`),
    protocol: 'file:',
    slashes: true,
    hash: `/${hash}`
  })
  return pathUrl;
}

/** Keys whose values a log must not carry: the server's session secret, and any token or password. */
const SECRET_KEY = /secret|token|password/i;

/**
 * The server's arguments with their secret values masked, for logging: electron-log writes the console to a file.
 *
 * @param args The arguments passed to the server process.
 */
export function redactSecrets(args: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(args || {}).map(([key, value]) => [key, SECRET_KEY.test(key) && value ? '[redacted]' : value])
  );
}
