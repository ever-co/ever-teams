import { flagOption, parseOptions } from './args.js';
import { Command, Trail } from './command.js';
import { COMMANDS } from './commands/index.js';
import { failureOf } from './failures.js';
import { commandHelp, generalHelp } from './help.js';
import { CliIo } from './io.js';
import { createOutput, Output } from './output.js';
import { EXIT_DONE, UsageError } from './refusals.js';
import { VERSION } from './version.js';

const HELP_FLAGS = ['--help', '-h'];

function commandNamed(name: string | undefined): Command {
	if (name === undefined) {
		throw new UsageError('Name a command, such as ever-teams status.');
	}
	if (name.startsWith('-')) {
		throw new UsageError(`Put the command first, as in ever-teams status ${name}.`);
	}
	const command = COMMANDS.find((candidate) => candidate.name === name);
	if (!command) {
		throw new UsageError(`There is no command ${name}.`);
	}
	return command;
}

// The same text, as it is for a person, or in JSON with --json.
function writeHelp(text: string, output: Output): void {
	if (output.json) {
		output.result({ help: text }, []);
		return;
	}
	output.data(text);
}

// "ever-teams help" and "ever-teams help <command>".
function showHelp(topic: string | undefined, output: Output): void {
	if (topic === undefined) {
		writeHelp(generalHelp(COMMANDS), output);
		return;
	}
	writeHelp(commandHelp(commandNamed(topic)), output);
}

async function dispatch(io: CliIo, output: Output, trail: Trail): Promise<void> {
	const [first, ...rest] = io.argv;
	if (first !== undefined && HELP_FLAGS.includes(first)) {
		showHelp(undefined, output);
		return;
	}
	if (first === 'help') {
		// "help --json" asks for the general help, in JSON.
		const topic = rest.find((argument) => !argument.startsWith('-'));
		showHelp(topic, output);
		return;
	}
	if (first === '--version') {
		output.result({ version: VERSION }, [VERSION]);
		return;
	}
	const command = commandNamed(first);
	trail.command = command.name;
	const values = parseOptions(command.name, rest, command.options);
	if (flagOption(values, 'help')) {
		writeHelp(commandHelp(command), output);
		return;
	}
	await command.run({ io, values, output, trail });
}

/** Runs the command line `io.argv` and answers its exit code: 0 done, 1 refused or failed, 2 usage error. */
export async function run(io: CliIo): Promise<number> {
	const output = createOutput(io, io.argv.includes('--json'));
	// Hidden before any argument is read: a usage error repeats the argument it refuses.
	const environmentToken = io.env.EVER_TEAMS_TOKEN?.trim();
	if (environmentToken) {
		output.hide(environmentToken);
	}
	const trail: Trail = { command: '' };
	try {
		await dispatch(io, output, trail);
		return EXIT_DONE;
	} catch (error) {
		const failure = failureOf(error, trail);
		output.failure(failure);
		return failure.exitCode;
	}
}
