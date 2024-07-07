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
