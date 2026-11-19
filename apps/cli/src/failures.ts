import { Trail } from './command.js';
import { Failure } from './output.js';
import { EXIT_FAILED, EXIT_USAGE, Refusal, UsageError } from './refusals.js';

const ISSUES = 'https://github.com/ever-co/ever-teams/issues';

function helpHint(command: string): string {
	if (command) {
		return `Run ever-teams ${command} --help to see how to use it.`;
	}
	return 'Run ever-teams --help to see the commands.';
}

function messageOf(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

/** The failure to report for what a command threw: one sentence with what to do next, and the exit code. */
export function failureOf(error: unknown, trail: Trail): Failure {
	if (error instanceof UsageError) {
		return { code: 'USAGE', message: `${error.message} ${helpHint(trail.command)}`, exitCode: EXIT_USAGE };
	}
	if (error instanceof Refusal) {
		return { code: error.code, message: error.message, exitCode: EXIT_FAILED };
	}
	const reason = messageOf(error);
	const message = `Something went wrong (${reason}): try again, and report it at ${ISSUES} if it keeps happening.`;
	return { code: 'UNEXPECTED', message, exitCode: EXIT_FAILED };
}
