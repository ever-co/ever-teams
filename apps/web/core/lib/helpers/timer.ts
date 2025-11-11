import { LOCAL_TIMER_STORAGE_KEY } from '@/core/constants/config/constants';

export const getLocalTimerStorageKey = (teamId?: string | null): string => {
	return teamId ? `${LOCAL_TIMER_STORAGE_KEY}-${teamId}` : LOCAL_TIMER_STORAGE_KEY;
};
