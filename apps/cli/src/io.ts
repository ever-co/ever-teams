import os from 'node:os';
import type { Readable } from 'node:stream';

/** Where a token is typed or piped in: the terminal, or a stand-in in the tests. */
export interface PromptInput extends Readable {
	isTTY?: boolean;
	setRawMode?(mode: boolean): unknown;
}

/** Everything the command line reads from or writes to the world, so a test can give its own. */
export interface CliIo {
	argv: string[];
	env: Record<string, string | undefined>;
	platform: NodeJS.Platform;
	homedir: string;
	stdin: PromptInput;
	writeOut(text: string): void;
	writeErr(text: string): void;
	fetch: typeof fetch;
	now(): Date;
}

export function processIo(): CliIo {
	return {
		argv: process.argv.slice(2),
		env: process.env,
		platform: process.platform,
		homedir: os.homedir(),
		stdin: process.stdin,
		writeOut: (text) => process.stdout.write(text),
		writeErr: (text) => process.stderr.write(text),
		fetch: (input, init) => globalThis.fetch(input, init),
		now: () => new Date()
	};
}
