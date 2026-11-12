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

export function paletteNumberLabelOf(task: PaletteStartTask): string {
	if (!task.taskNumber) {
		return '';
	}
	return `#${task.taskNumber}`;
}

// The number is searched as the entry shows it: "#WEB-13" typed back finds the task, and "WEB-13" still does
function searchTextOf(task: PaletteStartTask, actionLabel: string): string {
	const parts = [actionLabel, paletteNumberLabelOf(task), task.title];
	const text = parts.filter(Boolean).join(' ');
	return text.toLowerCase();
}

/**
 * What the palette's own filter reads for a start entry: the text the task was picked on, then its id so two
 * tasks of one title stay two entries. An entry picked here on a word the filter cannot find would not show.
 */
export function paletteStartValueOf(task: PaletteStartTask & { id: string }, actionLabel: string): string {
	const text = searchTextOf(task, actionLabel);
	return `${text} start-timer:${task.id}`;
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

export interface PaletteStopState {
	/** The timer shows a run: false for one going on for another team, which its button does not stop. */
	isTimerRunning: boolean;
	/** The timer's Start and Stop are enabled (email verified, a task the timer can run on). */
	canRunTimer: boolean;
	/** A start or a stop is in flight, or the first timer status is loading. */
	isTimerRequestPending: boolean;
}

/**
 * Whether the palette offers "Stop timer": only while the timer's own Stop button would act. That button is disabled
 * when the timer cannot run and while a timer request is in flight, and a stop chosen then would be discarded.
 */
export function canStopFromPalette(state: PaletteStopState): boolean {
	if (!state.isTimerRunning) {
		return false;
	}
	if (state.isTimerRequestPending) {
		return false;
	}
	return state.canRunTimer;
}

export type PaletteStartAction =
	| 'ALREADY_RUNNING'
	| 'EMAIL_NOT_VERIFIED'
	| 'UNAVAILABLE'
	| 'MAIN_START'
	| 'BLOCKED_BY_PLAN'
	| 'TASK_START';

export interface PaletteStartState {
	/** The task is the active team task, whether or not the timer status is known yet. */
	isActiveTask: boolean;
	/** The timer shows a run: false while its status is not known, and for a run going on for another team. */
	isTimerRunning: boolean;
	/** A card's start does not check it, and the timer's Stop refuses such a member: the start could not be undone. */
	isEmailVerified: boolean;
	/** The main Start is disabled (email not verified, task closed). */
	isMainStartDisabled: boolean;
	/** The plan rule of the team lets a card start this task. */
	canTrackTask: boolean;
}

/**
 * What a start asked from the palette does, by the rules of the task's own card: the active task goes through the
 * main Start (and its daily plan dialogs), any other task through its card's start, which the plan rule can refuse.
 * A member whose email is not verified starts neither.
 */
export function paletteStartActionOf(state: PaletteStartState): PaletteStartAction {
	const isRunningOnTask = state.isActiveTask && state.isTimerRunning;
	if (isRunningOnTask) {
		return 'ALREADY_RUNNING';
	}
	if (!state.isEmailVerified) {
		return 'EMAIL_NOT_VERIFIED';
	}
	if (state.isActiveTask) {
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
