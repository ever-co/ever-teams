/* eslint import/prefer-default-export: off */
import path from 'path';

export function resolveHtmlPath(htmlFileName: string, hash: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    return `http://localhost:${port}#/${hash}`;
  }
  return `file://${path.resolve(__dirname, '../renderer/', `${htmlFileName}#`, `${hash}`)}`;
}
