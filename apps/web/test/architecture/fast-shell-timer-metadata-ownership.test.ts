import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIMER_API = resolve(__dirname, '../../core/hooks/timer/use-timer-api.ts');

describe('fast-shell timer task-status ownership', () => {
	it('keeps task statuses enabled whenever the timer API is enabled', () => {
		const source = readFileSync(TIMER_API, 'utf8');

		// startTimer maps the current IN_PROGRESS status to its concrete taskStatusId.
		// Owning the scoped timer-status observer must not suppress that metadata read.
		expect(source).toMatch(/useTaskStatusesQuery\(\{\s*enabled\s*\}\)/);
		expect(source).not.toMatch(/useTaskStatusesQuery\(\{\s*enabled:\s*!statusEnabled\s*\}\)/);
	});
});
