export const PALETTE_START_TASKS_LIMIT = 5;

const CLOSED_TASK_STATUS = 'closed';

interface PaletteStartTask {
	title?: string | null;
	taskNumber?: string | null;
	status?: string | null;
}

function searchWordsOf(search: string): string[] {
	const words = search.toLowerCase().split(/\s+/);
	return words.filter((word) => word !== '');
}

function searchTextOf(task: PaletteStartTask, actionLabel: string): string {
	const parts = [actionLabel, task.taskNumber, task.title];
	const text = parts.filter(Boolean).join(' ');
	return text.toLowerCase();
}

/**
 * The tasks the palette offers to start the timer on: the open ones whose action label, number or title holds every
 * word typed. None before the member types.
 */
export function tasksToStartFor<T extends PaletteStartTask>(
	tasks: T[],
	search: string,
	actionLabel: string,
	limit: number = PALETTE_START_TASKS_LIMIT
): T[] {
	const words = searchWordsOf(search);
	if (words.length === 0) {
		return [];
	}
	const matches = tasks.filter((task) => {
		if (task.status === CLOSED_TASK_STATUS) {
			return false;
		}
		const text = searchTextOf(task, actionLabel);
		return words.every((word) => text.includes(word));
	});
	return matches.slice(0, limit);
}

export type PaletteStartAction = 'ALREADY_RUNNING' | 'UNAVAILABLE' | 'MAIN_START' | 'BLOCKED_BY_PLAN' | 'TASK_START';

export interface PaletteStartState {
	/** The task is the active one and the timer status is known: its card shows the main start and stop. */
	isActiveTask: boolean;
	isTimerRunning: boolean;
	/** The main Start is disabled (email not verified, task closed). */
	isMainStartDisabled: boolean;
	/** The plan rule of the team lets a card start this task. */
	canTrackTask: boolean;
}

/**
 * What a start asked from the palette does, by the rules of the task's own card: the active task goes through the
 * main Start (and its daily plan dialogs), any other task through its card's start, which the plan rule can refuse.
 */
export function paletteStartActionOf(state: PaletteStartState): PaletteStartAction {
	if (state.isActiveTask) {
		if (state.isTimerRunning) {
			return 'ALREADY_RUNNING';
		}
		if (state.isMainStartDisabled) {
			return 'UNAVAILABLE';
		}
		return 'MAIN_START';
	}
	if (!state.canTrackTask) {
		return 'BLOCKED_BY_PLAN';
	}
	return 'TASK_START';
}
