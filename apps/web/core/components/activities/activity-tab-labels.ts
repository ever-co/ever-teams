import { ActivityFilters } from '@/core/constants/config/constants';

export const ACTIVITY_TAB_LABEL_KEYS = {
	[ActivityFilters.TASKS]: 'common.TASKS',
	[ActivityFilters.SCREENSHOOTS]: 'common.SCREENSHOTS',
	[ActivityFilters.APPS]: 'timer.APPS',
	[ActivityFilters.VISITED_SITES]: 'timer.VISITED_SITES'
} as const satisfies Record<ActivityFilters, string>;
