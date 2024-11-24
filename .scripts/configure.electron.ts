import * as fs from 'fs';
import * as path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

const argv: any = yargs(hideBin(process.argv)).argv;

function modifiedNextServer() {
    const filePath = path.resolve(__dirname, '../apps/server-web/release/app/dist/standalone/apps/web/server.js');

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
}

function modifiedWebConstant() {
    const filePath = path.resolve(__dirname, '../apps/web/app/constants.ts');

    let fileContent = fs.readFileSync(filePath, 'utf8');
    const searchString = `export const IS_DESKTOP_APP = process.env.IS_DESKTOP_APP === 'true';`;
    const codeToReplace = `export const IS_DESKTOP_APP = true;`;

    fileContent = fileContent.replace(searchString, codeToReplace);

    fs.writeFileSync(filePath, fileContent, 'utf8');
}

function revertWebConstant() {
    const filePath = path.resolve(__dirname, '../apps/web/app/constants.ts');

    let fileContent = fs.readFileSync(filePath, 'utf8');
    const codeToReplace = `export const IS_DESKTOP_APP = process.env.IS_DESKTOP_APP === 'true';`;
    const searchString = `export const IS_DESKTOP_APP = true;`;

    fileContent = fileContent.replace(searchString, codeToReplace);

    fs.writeFileSync(filePath, fileContent, 'utf8');
}


if (argv.type === 'server') {
    modifiedNextServer();
    revertWebConstant();
} else if (argv.type === 'constant') {
    modifiedWebConstant();
}
