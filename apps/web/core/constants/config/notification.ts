export const NOTIFICATION_KEYS = {
	USER_OUTSTANDING: 'user_outstanding_notification_state',
	MANAGER_OUTSTANDING: 'manager_outstanding_notification_state'
} as const;

export const NOTIFICATION_CONFIG = {
	MIN_REAPPEAR_DELAY: 60 * 60 * 1000,
	MAX_DISMISSALS_PER_DAY: 3,
	EXTENDED_DELAY_MULTIPLIER: 4,
	MIN_TASK_THRESHOLD: 1,
	TASK_INCREASE_THRESHOLD: 2
} as const;
