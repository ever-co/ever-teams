import { Command, CommandContext } from '../command.js';
import { recordOfLog, workOf } from '../entries.js';
import { clockOf, durationText } from '../format.js';
import { namesOf } from '../lookup.js';
import { openSession } from '../session.js';

// A stop with no timer running leaves the timer as asked: the command succeeds and says so.
async function stop(context: CommandContext): Promise<void> {
	const { output } = context;
	const client = openSession(context);
	const timer = await client.timer.status();
	if (!timer.running) {
		output.result({ stopped: false, entry: null }, ['The timer was not running: there was nothing to stop.']);
		return;
	}
	const log = await client.timer.stop();
	if (!log) {
		output.result({ stopped: true, entry: null }, ['Timer stopped.']);
		return;
	}
	const names = await namesOf(client, log);
	const entry = recordOfLog(log, names, context.io.now());
	const stoppedAt = clockOf(new Date(log.stoppedAt));
	const line = `Timer stopped at ${stoppedAt} after ${durationText(entry.durationSeconds)}${workOf(entry)}.`;
	output.result({ stopped: true, entry }, [line]);
}

export const stopCommand: Command = {
	name: 'stop',
	summary: 'Stop your timer',
	usage: 'stop',
	description:
		'Stops your timer, wherever it was started (here, the web app, the desktop app). With no timer running,\n' +
		'it says so and succeeds.',
	options: {},
	optionHelp: [],
	examples: ['ever-teams stop', 'ever-teams stop --json'],
	run: stop
};
