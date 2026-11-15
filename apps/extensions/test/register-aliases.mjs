// `node --import ./test/register-aliases.mjs --test ...`: see alias-hooks.mjs.
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
