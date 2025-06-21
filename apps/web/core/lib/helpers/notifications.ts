import { HAS_VISITED_OUTSTANDING_TASKS } from '@/core/constants/config/constants';
import { NOTIFICATION_CONFIG } from '@/core/constants/config/notification';
import { INotificationState } from '@/core/types/interfaces/common/notification';
import { TTask } from '@/core/types/schemas';
import moment from 'moment';
import { toast } from 'sonner';

export const getNotificationState = (key: string): INotificationState => {
	try {
		const stored = localStorage.getItem(key);
		return stored
			? JSON.parse(stored)
			: {
					lastDismissed: 0,
					dismissCount: 0,
					lastTaskHash: '',
					lastShownCount: 0
				};
	} catch {
		return {
			lastDismissed: 0,
			dismissCount: 0,
			lastTaskHash: '',
			lastShownCount: 0
		};
	}
};

export const setNotificationState = (key: string, state: INotificationState): void => {
	try {
		localStorage.setItem(key, JSON.stringify(state));
	} catch {
		toast.error('Failed to set notification state');
	}
};

export const markOutstandingTasksVisited = (): void => {
	localStorage.setItem(HAS_VISITED_OUTSTANDING_TASKS, moment().format('YYYY-MM-DD'));
};

export const createTaskHash = (tasks: Partial<TTask>[]): string => {
	return tasks
		.map((task) => `${task.id}-${task.status}`)
		.sort()
		.join('|');
};

export const shouldShowNotification = (
	taskCount: number,
	tasks: Partial<TTask>[],
	notificationKey: string
): boolean => {
	if (taskCount < NOTIFICATION_CONFIG.MIN_TASK_THRESHOLD) return false;

	const state = getNotificationState(notificationKey);
	const now = Date.now();
	const today = new Date().toDateString();
	const lastDismissedToday = new Date(state.lastDismissed).toDateString() === today;

	if (!lastDismissedToday) state.dismissCount = 0;

	const timeSinceLast = now - state.lastDismissed;
	const requiredDelay =
		state.dismissCount >= NOTIFICATION_CONFIG.MAX_DISMISSALS_PER_DAY
			? NOTIFICATION_CONFIG.MIN_REAPPEAR_DELAY * NOTIFICATION_CONFIG.EXTENDED_DELAY_MULTIPLIER
			: NOTIFICATION_CONFIG.MIN_REAPPEAR_DELAY;

	if (timeSinceLast < requiredDelay) return false;

	const currentTaskHash = createTaskHash(tasks);
	const tasksChanged = currentTaskHash !== state.lastTaskHash;
	const taskCountIncreased = taskCount > state.lastShownCount + NOTIFICATION_CONFIG.TASK_INCREASE_THRESHOLD;

	const shouldShow = state.lastDismissed === 0 || tasksChanged || taskCountIncreased;

	if (shouldShow) {
		setNotificationState(notificationKey, {
			...state,
			lastTaskHash: currentTaskHash,
			lastShownCount: taskCount
		});
	}

	return shouldShow;
};

export const dismissNotification = (notificationKey: string): void => {
	const state = getNotificationState(notificationKey);
	const now = Date.now();
	const today = new Date().toDateString();
	const lastDismissedToday = new Date(state.lastDismissed).toDateString() === today;

	setNotificationState(notificationKey, {
		...state,
		lastDismissed: now,
		dismissCount: lastDismissedToday ? state.dismissCount + 1 : 1
	});
};
