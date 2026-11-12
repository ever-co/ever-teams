import { paletteStartActionOf, paletteStartValueOf, tasksToStartFor, type PaletteStartState } from './palette-timer';

const TASKS = [
	{ id: '1', title: 'Fix the login page', taskNumber: 'WEB-12', status: 'in-progress' },
	{ id: '2', title: 'Write the invoice export', taskNumber: 'WEB-13', status: 'open' },
	{ id: '3', title: 'Fix the invoice totals', taskNumber: 'WEB-14', status: 'closed' },
	{ id: '4', title: 'Login rate limit', taskNumber: 'API-2', status: 'open' }
];

const ACTION_LABEL = 'Start timer';

function idsOf(tasks: Array<{ id: string }>) {
	return tasks.map((task) => task.id);
}

describe('tasksToStartFor', () => {
	it('offers nothing before the member types', () => {
		expect(tasksToStartFor(TASKS, '', ACTION_LABEL)).toEqual([]);
		expect(tasksToStartFor(TASKS, '   ', ACTION_LABEL)).toEqual([]);
	});

	it('finds a task by a word of its title, whatever the case', () => {
		expect(idsOf(tasksToStartFor(TASKS, 'LOGIN', ACTION_LABEL))).toEqual(['1', '4']);
	});

	it('finds a task by its number', () => {
		expect(idsOf(tasksToStartFor(TASKS, 'web-13', ACTION_LABEL))).toEqual(['2']);
	});

	it('finds a task by its number typed as its entry shows it', () => {
		expect(idsOf(tasksToStartFor(TASKS, '#WEB-13', ACTION_LABEL))).toEqual(['2']);
	});

	it('keeps only the tasks that hold every word typed', () => {
		expect(idsOf(tasksToStartFor(TASKS, 'fix login', ACTION_LABEL))).toEqual(['1']);
	});

	it('finds the tasks by the name of the action followed by a word of the title', () => {
		expect(idsOf(tasksToStartFor(TASKS, 'start timer invoice', ACTION_LABEL))).toEqual(['2']);
	});

	it('never offers a closed task', () => {
		expect(idsOf(tasksToStartFor(TASKS, 'totals', ACTION_LABEL))).toEqual([]);
	});

	it('stops at the limit', () => {
		expect(idsOf(tasksToStartFor(TASKS, 'start', ACTION_LABEL, 2))).toEqual(['1', '2']);
	});
});

describe('paletteStartValueOf', () => {
	it('holds every word a task can be picked on, so the palette filter keeps the entry', () => {
		const task = { id: 'task-7', title: 'Fix the Login page', taskNumber: 'WEB-7', status: 'open' };

		const value = paletteStartValueOf(task, ACTION_LABEL);

		expect(value).toContain('fix the login page');
		expect(value).toContain('web-7');
		expect(value).toContain('start timer');
		expect(value).toContain('task-7');
	});
});

describe('paletteStartActionOf', () => {
	const otherTask: PaletteStartState = {
		isActiveTask: false,
		isTimerRunning: false,
		isMainStartDisabled: false,
		canTrackTask: true
	};
	const activeTask: PaletteStartState = { ...otherTask, isActiveTask: true };

	it("starts another task through its card's start", () => {
		expect(paletteStartActionOf(otherTask)).toBe('TASK_START');
	});

	it('starts another task while the timer runs on the active one, as its card does', () => {
		expect(paletteStartActionOf({ ...otherTask, isTimerRunning: true })).toBe('TASK_START');
	});

	it('refuses a task the plan rule of the team does not let start', () => {
		expect(paletteStartActionOf({ ...otherTask, canTrackTask: false })).toBe('BLOCKED_BY_PLAN');
	});

	it('sends the active task through the main Start', () => {
		expect(paletteStartActionOf(activeTask)).toBe('MAIN_START');
	});

	it('never stops the timer already running on the task asked for', () => {
		expect(paletteStartActionOf({ ...activeTask, isTimerRunning: true })).toBe('ALREADY_RUNNING');
	});

	it('does nothing the disabled main Start would not do', () => {
		expect(paletteStartActionOf({ ...activeTask, isMainStartDisabled: true })).toBe('UNAVAILABLE');
	});
});
