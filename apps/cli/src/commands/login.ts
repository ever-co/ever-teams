import { flagOption } from '../args.js';
import { Command, CommandContext } from '../command.js';
import { readLogin, StoredLogin, writeLogin } from '../config.js';
import { readHidden, readPiped } from '../prompt.js';
import { Refusal, UsageError } from '../refusals.js';
import { apiUrlOf, clientFor, isUnencrypted } from '../session.js';

// Gauzy's personal API tokens start with it: a login keeps only a token that lasts.
const PERSONAL_TOKEN_PREFIX = 'gzp_';

const QUESTION = 'Personal API token (hidden while you type or paste it): ';

async function tokenGiven(context: CommandContext): Promise<string> {
	const input = context.io.stdin;
	if (flagOption(context.values, 'token-stdin')) {
		return readPiped(input);
	}
	const canPrompt = input.isTTY === true && typeof input.setRawMode === 'function';
	if (!canPrompt) {
		throw new UsageError('There is no terminal to type the token in: pipe it in with --token-stdin.');
	}
	return readHidden(input, (text) => context.io.writeErr(text), QUESTION);
}

// A settings file that cannot be read is the one login replaces: it gives no address, and is no reason to refuse.
function storedLogin(context: CommandContext): StoredLogin | null {
	try {
		return readLogin(context.io);
	} catch (error) {
		const isDamaged = error instanceof Refusal && error.code === 'SETTINGS_DAMAGED';
		if (isDamaged) {
			return null;
		}
		throw error;
	}
}

function checkToken(token: string): void {
	if (!token) {
		throw new UsageError('No token was given.');
	}
	if (!token.startsWith(PERSONAL_TOKEN_PREFIX)) {
		throw new UsageError(
			'This is not a personal API token, which starts with gzp_: create one in Settings > API tokens.'
		);
	}
}

async function login(context: CommandContext): Promise<void> {
	const { io, output } = context;
	const apiUrl = apiUrlOf(context, storedLogin(context));
	const token = await tokenGiven(context);
	output.hide(token);
	checkToken(token);
	if (isUnencrypted(apiUrl)) {
		output.note(`Warning: ${apiUrl} is not https, so the token travels unencrypted.`);
	}
	const client = clientFor(context, apiUrl, token, 'typed');
	await client.timer.status();
	const file = writeLogin(io, { apiUrl, token });
	output.result({ signedIn: true, apiUrl, settingsFile: file }, [
		`Signed in to ${apiUrl}. The token is kept in ${file}.`
	]);
	if (io.env.EVER_TEAMS_TOKEN) {
		output.note('EVER_TEAMS_TOKEN is set in this shell: the command line uses it in place of the stored token.');
	}
}

export const loginCommand: Command = {
	name: 'login',
	summary: 'Sign in with a personal API token, checked once, then kept',
	usage: 'login [--token-stdin] [--api-url <url>]',
	description:
		'Asks for a personal API token (create one in Settings > API tokens of the web app), checks it once\n' +
		'with the server, then keeps it with the address in your settings folder (on Linux and macOS in a file\n' +
		'of mode 600, which other accounts may not read). The token is never an argument, so it never lands in\n' +
		'your shell history.',
	options: { 'token-stdin': { type: 'boolean' } },
	optionHelp: [['--token-stdin', 'Read the token from the standard input instead of asking for it']],
	examples: [
		'ever-teams login',
		'ever-teams login --api-url https://teams.example.com/api',
		'ever-teams login --token-stdin < token.txt'
	],
	run: login
};
