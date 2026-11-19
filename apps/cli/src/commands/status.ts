import { EverTeamsTimerStatus } from '@ever-teams/api';
import { Command, CommandContext } from '../command.js';
import { recordOfLog, workOf } from '../entries.js';
import { clockOf, durationText } from '../format.js';
import { namesOf } from '../lookup.js';
import { openSession } from '../session.js';

function runningLogOf(timer: EverTeamsTimerStatus) {
	if (!timer.running) {
		return null;
	}
	return timer.lastLog;
}

async function status(context: CommandContext): Promise<void> {
	const client = openSession(context);
	const timer = await client.timer.status();
	const today = `Today: ${durationText(timer.duration)} tracked.`;
	const log = runningLogOf(timer);
	if (!log) {
		context.output.result({ running: false, todaySeconds: timer.duration, entry: null }, [
			`The timer is stopped. ${today}`
		]);
		return;
	}
	const names = await namesOf(client, log);
	const entry = recordOfLog(log, names, context.io.now());
	const since = clockOf(new Date(entry.startedAt));
	const running = `The timer is running since ${since} (${durationText(entry.durationSeconds)})${workOf(entry)}.`;
	context.output.result({ running: true, todaySeconds: timer.duration, entry }, [running, today]);
}

export const statusCommand: Command = {
	name: 'status',
	summary: 'Show whether your timer runs, and the time tracked today',
	usage: 'status',
	description: 'Shows whether your timer runs, since when and on what, and the time you tracked today.',
	options: {},
	optionHelp: [],
	examples: ['ever-teams status', 'ever-teams status --json'],
	run: status
};
