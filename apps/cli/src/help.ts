import { Command } from './command.js';

type HelpRow = [string, string];

const COMMON_HELP: HelpRow[] = [
	['--json', 'Answer in JSON (a failure too, on the error output)'],
	['--api-url <url>', "The API's address, ending with /api (or EVER_TEAMS_API_URL)"],
	['-h, --help', 'Show this help']
];

const ENVIRONMENT_HELP: HelpRow[] = [
	['EVER_TEAMS_TOKEN', 'A personal API token, used in place of the one login stored'],
	['EVER_TEAMS_API_URL', "The API's address, used in place of the one login stored"]
];

function columns(rows: HelpRow[]): string[] {
	const width = Math.max(0, ...rows.map(([left]) => left.length));
	return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`);
}

const textOf = (lines: string[]) => `${lines.join('\n')}\n`;

export function generalHelp(commands: Command[]): string {
	const commandRows = commands.map((command): HelpRow => [command.name, command.summary]);
	return textOf([
		'Usage: ever-teams <command> [options]',
		'',
		'Track your own time in Ever Teams from a terminal or a script.',
		'',
		'Commands:',
		...columns(commandRows),
		'',
		'Options of every command:',
		...columns(COMMON_HELP),
		'',
		'Environment:',
		...columns(ENVIRONMENT_HELP),
		'',
		'Exit codes: 0 done, 1 refused or failed, 2 usage error.',
		'Run ever-teams <command> --help for the options of a command, ever-teams --version for the version.'
	]);
}

function examplesOf(command: Command): string[] {
	if (command.examples.length === 0) {
		return [];
	}
	const examples = command.examples.map((example) => `  ${example}`);
	return ['', 'Examples:', ...examples];
}

export function commandHelp(command: Command): string {
	return textOf([
		`Usage: ever-teams ${command.usage}`,
		'',
		command.description,
		'',
		'Options:',
		...columns([...command.optionHelp, ...COMMON_HELP]),
		...examplesOf(command)
	]);
}
