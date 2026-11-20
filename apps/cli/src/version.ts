import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../package.json') as { version: string };

export const VERSION = manifest.version;
