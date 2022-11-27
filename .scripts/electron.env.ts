import { argv } from 'yargs';

const environment = argv.environment;
const isProd = environment === 'prod';

console.log('Is Production: ' + isProd);
