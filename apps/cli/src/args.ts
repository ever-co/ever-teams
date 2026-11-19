import { parseArgs } from 'node:util';
import { UsageError } from './refusals.js';

export interface OptionSpec {
	type: 'string' | 'boolean';
	short?: string;
}

export type OptionSpecs = { [name: string]: OptionSpec };

export type OptionValues = { [name: string]: string | boolean | undefined };

/** The options every command takes. */
export const COMMON_OPTIONS: OptionSpecs = {
	json: { type: 'boolean' },
	'api-url': { type: 'string' },
	help: { type: 'boolean', short: 'h' }
};

// The tokens parseArgs answers, as this file reads them.
type ArgToken =
	| { kind: 'option'; name: string; rawName: string; value: string | undefined; inlineValue: boolean | undefined }
	| { kind: 'positional'; value: string }
	| { kind: 'option-terminator' };

function checkValue(token: Extract<ArgToken, { kind: 'option' }>, spec: OptionSpec): void {
	if (spec.type === 'boolean') {
		if (token.inlineValue) {
			throw new UsageError(`${token.rawName} takes no value.`);
		}
		return;
	}
	if (token.value === undefined) {
		throw new UsageError(`${token.rawName} needs a value.`);
	}
	// "--note --json" would take --json as the note.
	const looksLikeOption = !token.inlineValue && token.value.startsWith('-');
	if (looksLikeOption) {
		throw new UsageError(
			`${token.rawName} needs a value. For a value that starts with -, write ${token.rawName}=${token.value}.`
		);
	}
}

function checkToken(command: string, token: ArgToken, specs: OptionSpecs): void {
	if (token.kind === 'positional') {
		throw new UsageError(`${command} takes options only, and ${token.value} is not one.`);
	}
	if (token.kind !== 'option') {
		return;
	}
	const isKnown = Object.hasOwn(specs, token.name);
	if (!isKnown) {
		throw new UsageError(`${command} has no option ${token.rawName}.`);
	}
	checkValue(token, specs[token.name]);
}

/** The options after the command, each checked against the command's own and the common ones. */
export function parseOptions(command: string, args: string[], own: OptionSpecs): OptionValues {
	const specs = { ...COMMON_OPTIONS, ...own };
	const { values, tokens } = parseArgs({ args, options: specs, strict: false, allowPositionals: true, tokens: true });
	for (const token of tokens) {
		checkToken(command, token, specs);
	}
	return values;
}

export function textOption(values: OptionValues, name: string): string | undefined {
	const value = values[name];
	if (typeof value === 'string') {
		return value;
	}
	return undefined;
}

export const flagOption = (values: OptionValues, name: string): boolean => values[name] === true;
