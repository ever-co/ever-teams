import * as fs from 'node:fs';
import * as path from 'node:path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

interface Arguments {
	type: 'server' | 'constant';
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
	// Next.js 16: serverRuntimeConfig is removed, environment variables are used directly
	// The configuration is now handled through environment variables at runtime
	console.log('Next.js 16: serverRuntimeConfig is no longer needed. Environment variables are used directly.');
	console.log('Ensure GAUZY_API_SERVER_URL and NEXT_PUBLIC_GAUZY_API_SERVER_URL are set in your environment.');
}

function updateWebConstant(setDesktopApp: boolean) {
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
