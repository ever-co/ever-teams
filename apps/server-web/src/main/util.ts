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

/**
 * Whether a URL is the app's own page: the bundled `index.html` (any hash route), or the dev server in development.
 *
 * @param target The URL a window is asked to show.
 */
export function isAppPage(target: string): boolean {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  const own = new URL(resolveHtmlPath('index.html', ''));
  if (own.protocol === 'file:') {
    return url.protocol === 'file:' && url.host === own.host && url.pathname === own.pathname;
  }
  return url.origin === own.origin;
}

/** The links a window hands to the user's browser instead of following them itself. */
export function isExternalLink(target: string): boolean {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(target).protocol);
  } catch {
    return false;
  }
}

/** The server settings the setup and settings forms write, and the only ones passed on to the web server. */
const SERVER_SETTING_KEYS = [
  'PORT',
  'GAUZY_API_SERVER_URL',
  'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
  'DESKTOP_WEB_SERVER_HOSTNAME',
  'useSsl',
  'sslKey',
  'sslSecret'
] as const;

/**
 * The known server settings of a payload, and nothing else.
 *
 * The settings are stored as given and spread into the web server's environment, so any other key, from the settings
 * message or a hand-edited `config.json`, became an environment variable of the server process: `NODE_OPTIONS`
 * among them, which runs code in it (elevated, on Windows).
 *
 * @param settings The settings to read.
 */
export function pickServerSettings(settings: Record<string, any> | null | undefined): Record<string, any> {
  const picked: Record<string, any> = {};
  if (!settings || typeof settings !== 'object') {
    return picked;
  }
  for (const key of SERVER_SETTING_KEYS) {
    if (settings[key] !== undefined) {
      picked[key] = settings[key];
    }
  }
  return picked;
}
