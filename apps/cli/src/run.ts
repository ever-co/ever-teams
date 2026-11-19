import { CliIo } from './io.js';
import { VERSION } from './version.js';

/** Runs the command line `io.argv` and answers its exit code: 0 done, 2 usage error. */
export async function run(io: CliIo): Promise<number> {
	if (io.argv[0] === '--version') {
		io.writeOut(`${VERSION}\n`);
		return 0;
	}
	io.writeErr('ever-teams has no command yet: ever-teams --version shows its version.\n');
	return 2;
}
