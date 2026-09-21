import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TIMER_API = resolve(__dirname, '../../core/hooks/timer/use-timer-api.ts');
const TIMER = resolve(__dirname, '../../core/components/timer/timer.tsx');
const START_STOP_HANDLER = resolve(__dirname, '../../core/hooks/activities/use-start-stop-timer-handler.ts');

describe('shell timer task-status ownership', () => {
	it('keeps task statuses enabled whenever the timer API is enabled', () => {
		const source = readFileSync(TIMER_API, 'utf8');

		// startTimer maps the current IN_PROGRESS status to its concrete taskStatusId.
		// Owning the scoped timer-status observer must not suppress that metadata read.
		expect(source).toMatch(/useTaskStatusesQuery\(\{\s*enabled\s*\}\)/);
		expect(source).not.toMatch(/useTaskStatusesQuery\(\{\s*enabled:\s*!statusEnabled\s*\}\)/);
	});

	it('renders and executes the timer action from one readiness decision', () => {
		const timerSource = readFileSync(TIMER, 'utf8');
		const handlerSource = readFileSync(START_STOP_HANDLER, 'utf8');

		expect(handlerSource).toMatch(/const actionDisabled = timerStatusFetching \|\| !canRunTimer/);
		expect(handlerSource).toMatch(/actionDisabled,\s*startStopTimerHandler/);
		expect(timerSource).toMatch(/function useHydrated\(\)/);
		expect(timerSource.match(/disabled=\{!hydrated \|\| actionDisabled\}/g)).toHaveLength(2);
	});

	it('does not let idle mutation owners clear another owner\'s timer loading state', () => {
		const source = readFileSync(TIMER_API, 'utf8');

		expect(source).not.toMatch(/setTimerStatusFetching\(stopTimerMutation\.isPending\)/);
		expect(source).not.toMatch(/firstLoad\s*&&\s*\(!statusEnabled/);
		expect(source).toMatch(/firstLoad\s*&&\s*statusEnabled\s*&&\s*isCurrentScope\(\)/);
	});
});
