import * as fs from 'fs';
import * as path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

interface Arguments {
    type: 'server' | 'constant'
}
const argv = yargs(hideBin(process.argv))
  .options({
    type: {
      type: 'string',
      choices: ['server', 'constant'],
      demandOption: true,
      description: 'Type of configuration to modify'
    }
  })
  .parseSync() as Arguments;

function modifiedNextServer() {
    const filePath = path.resolve(__dirname, '../apps/server-web/release/app/dist/standalone/apps/web/server.js');
    try {
        let fileContent = fs.readFileSync(filePath, 'utf8');
        const searchString = 'process.env.__NEXT_PRIVATE_STANDALONE_CONFIG';
        const codeToInsert = `
        nextConfig.serverRuntimeConfig = {
            "GAUZY_API_SERVER_URL": process.env.GAUZY_API_SERVER_URL,
            "NEXT_PUBLIC_GAUZY_API_SERVER_URL": process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
        }
        `;

        let lines = fileContent.split('\n');
        const index = lines.findIndex((line) => line.includes(searchString));

        if (index !== -1) {
            lines.splice(index - 1, 0, codeToInsert);

            fileContent = lines.join('\n');
            fs.writeFileSync(filePath, fileContent, 'utf8');
            console.log('Line of code successfully inserted.');
        } else {
            console.log(`The string "${searchString}" was not found in the file.`);
        }
    } catch (error) {
        console.error('Failed to change static server configuration');
    }
}

function updateWebConstant(setDesktopApp:boolean) {
    const filePath = path.resolve(__dirname, '../apps/web/core/constants/config/constants.tsx');
    try {
       let fileContent = fs.readFileSync(filePath, 'utf8');
       const envCheck = `export const IS_DESKTOP_APP = process.env.IS_DESKTOP_APP === 'true';`;
       const hardcoded = `export const IS_DESKTOP_APP = true;`;

       const [from, to] = setDesktopApp ? [envCheck, hardcoded] : [hardcoded, envCheck];

       if (!fileContent.includes(from)) {
           throw new Error(`Expected content not found in ${filePath}`);
       }

       fileContent = fileContent.replace(from, to);
       fs.writeFileSync(filePath, fileContent, 'utf8');
       console.log(`Successfully ${setDesktopApp ? 'set' : 'reverted'} IS_DESKTOP_APP`);
   } catch (error) {
       console.error('Failed to update constants:', error);
       process.exit(1);
   }
}


if (argv.type === 'server') {
    modifiedNextServer();
    updateWebConstant(false);
} else if (argv.type === 'constant') {
    updateWebConstant(true);
}
