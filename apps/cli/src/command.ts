import { OptionSpecs, OptionValues } from './args.js';
import { CliIo } from './io.js';
import { Output } from './output.js';

/** Where a command stands when it fails: what the sentence that reports the failure needs. */
export interface Trail {
	command: string;
	/** The API the command talks to, once it is known. */
	apiUrl?: string;
	/** Where the token comes from: EVER_TEAMS_TOKEN, the stored login, or the one login was given. */
	tokenFrom?: 'environment' | 'login' | 'typed';
	/** The status the API answered the token exchange with, once it did. */
	exchangeStatus?: number;
}

export interface CommandContext {
	io: CliIo;
	values: OptionValues;
	output: Output;
	trail: Trail;
}

export interface Command {
	name: string;
	/** One line, for the list of commands. */
	summary: string;
	/** The command line, after "Usage: ". */
	usage: string;
	/** What it does, for its help. */
	description: string;
	options: OptionSpecs;
	/** Each option as its help shows it, with what it does. */
	optionHelp: Array<[string, string]>;
	examples: string[];
	run(context: CommandContext): Promise<void>;
}
