import { CliIo } from './io.js';

/** A failure as the command line reports it. */
export interface Failure {
	code: string;
	message: string;
	exitCode: number;
	/** The HTTP status of the API's answer, when the failure is one. */
	status?: number;
}

export interface Output {
	readonly json: boolean;
	/** Never printed: each time it appears in a text the command line writes, it is replaced. */
	hide(secret: string): void;
	/** The command's result: the value as JSON with --json, else the lines, for a person. */
	result(value: unknown, lines: string[]): void;
	/** A text written as it is, such as an export. */
	data(text: string): void;
	/** A note for a person on the error output; none with --json. */
	note(text: string): void;
	failure(failure: Failure): void;
}

const HIDDEN = '[hidden]';

function withoutSecrets(text: string, secrets: string[]): string {
	let shown = text;
	for (const secret of secrets) {
		shown = shown.split(secret).join(HIDDEN);
	}
	return shown;
}

const jsonText = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function createOutput(io: CliIo, json: boolean): Output {
	const secrets: string[] = [];
	const writeOut = (text: string) => io.writeOut(withoutSecrets(text, secrets));
	const writeErr = (text: string) => io.writeErr(withoutSecrets(text, secrets));

	function hide(secret: string): void {
		if (secret) {
			secrets.push(secret);
		}
	}

	function result(value: unknown, lines: string[]): void {
		if (json) {
			writeOut(jsonText(value));
			return;
		}
		for (const line of lines) {
			writeOut(`${line}\n`);
		}
	}

	function note(text: string): void {
		if (!json) {
			writeErr(`${text}\n`);
		}
	}

	function failure(reported: Failure): void {
		if (!json) {
			writeErr(`${reported.message}\n`);
			return;
		}
		const error = { code: reported.code, message: reported.message, status: reported.status };
		writeErr(jsonText({ error }));
	}

	return { json, hide, result, data: writeOut, note, failure };
}
