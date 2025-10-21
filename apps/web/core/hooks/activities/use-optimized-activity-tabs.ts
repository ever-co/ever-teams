import { useCallback, useRef, useMemo } from 'react';
import { useTimeSlots } from './use-time-slots';
import { useTimeDailyActivity } from './use-time-daily-activity';
import { useUserSelectedPage } from '@/core/hooks/users';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { TTask } from '@/core/types/schemas/task/task.schema';

interface ActivityTabCache {
	tasks: {
		data: TTask[];
		firstFiveTasks: TTask[];
		remainingTasks: TTask[];
		timestamp: number;
		loading: boolean;
		activeTaskId?: string;
	};
	screenshots: {
		data: any[];
		timestamp: number;
		loading: boolean;
	};
	apps: {
		data: any[];
		timestamp: number;
		loading: boolean;
	};
	visitedSites: {
		data: any[];
		timestamp: number;
		loading: boolean;
	};
}

interface UseOptimizedActivityTabsOptions {
	member?: any; // Member data for tasks
	cacheTimeout?: number; // Cache timeout in milliseconds (default: 5 minutes)
}

/**
 * Optimized hook for activity tabs that prevents recalculation when switching tabs
 * Provides intelligent caching for Screenshots, Apps, and Visited Sites tabs
 */
export const useOptimizedActivityTabs = ({
	member,
	cacheTimeout = 5 * 60 * 1000 // 5 minutes default
}: UseOptimizedActivityTabsOptions = {}) => {
	const cacheRef = useRef<ActivityTabCache>({
		tasks: { data: [], firstFiveTasks: [], remainingTasks: [], timestamp: 0, loading: false },
		screenshots: { data: [], timestamp: 0, loading: false },
		apps: { data: [], timestamp: 0, loading: false },
		visitedSites: { data: [], timestamp: 0, loading: false }
	});

	// Tasks data with caching - THE MAIN PERFORMANCE BOTTLENECK
	const profile = useUserSelectedPage(member?.employee?.userId);
	const hook = useTaskFilter(profile);
	const { user } = useAuthenticateUser();

	const tasksData = useMemo(() => {
		const now = Date.now();
		const cache = cacheRef.current.tasks;

		// Return cached data if still valid and same active task
		if (
			cache.data.length > 0 &&
			now - cache.timestamp < cacheTimeout &&
			cache.activeTaskId === profile?.activeUserTeamTask?.id
		) {
			return {
				firstFiveTasks: cache.firstFiveTasks,
				remainingTasks: cache.remainingTasks,
				totalCount: cache.data.length,
				loading: cache.loading
			};
		}

		// Process fresh data
		const tasks = hook.tasksFiltered;
		const activeTaskId = profile?.activeUserTeamTask?.id;

		// Filter out active task and remove duplicates
		const uniqueTasksMap = new Map<string, TTask>();
		tasks.forEach((task) => {
			if (task.id !== activeTaskId && !uniqueTasksMap.has(task.id)) {
				uniqueTasksMap.set(task.id, task);
			}
		});

		const filteredTasks = Array.from(uniqueTasksMap.values());
		const firstFiveTasks = filteredTasks.slice(0, 5);
		const remainingTasks = filteredTasks.slice(5);

		// Update cache with fresh data
		cacheRef.current.tasks = {
			data: filteredTasks,
			firstFiveTasks,
			remainingTasks,
			timestamp: now,
			loading: false, // useTaskFilter doesn't have loading state
			activeTaskId
		};

		return {
			firstFiveTasks,
			remainingTasks,
			totalCount: filteredTasks.length,
			loading: false // useTaskFilter doesn't have loading state
		};
	}, [hook.tasksFiltered, profile?.activeUserTeamTask?.id, cacheTimeout]);

	// Screenshots data with caching
	const screenshotsHook = useTimeSlots(true);
	const screenshotsData = useMemo(() => {
		const now = Date.now();
		const cache = cacheRef.current.screenshots;

		// Return cached data if still valid
		if (cache.data.length > 0 && now - cache.timestamp < cacheTimeout) {
			return {
				timeSlots: cache.data,
				loading: cache.loading
			};
		}

		// Update cache with fresh data
		if (screenshotsHook.timeSlots.length > 0 || !screenshotsHook.loading) {
			cacheRef.current.screenshots = {
				data: screenshotsHook.timeSlots,
				timestamp: now,
				loading: screenshotsHook.loading
			};
		}

		return {
			timeSlots: screenshotsHook.timeSlots,
			loading: screenshotsHook.loading
		};
	}, [screenshotsHook.timeSlots, screenshotsHook.loading, cacheTimeout]);

	// Apps data with caching
	const appsHook = useTimeDailyActivity('APP');
	const appsData = useMemo(() => {
		const now = Date.now();
		const cache = cacheRef.current.apps;

		// Return cached data if still valid
		if (cache.data.length > 0 && now - cache.timestamp < cacheTimeout) {
			return {
				visitedApps: cache.data,
				loading: cache.loading
			};
		}

		// Update cache with fresh data
		if (appsHook.visitedApps.length > 0 || !appsHook.loading) {
			cacheRef.current.apps = {
				data: appsHook.visitedApps,
				timestamp: now,
				loading: appsHook.loading
			};
		}

		return {
			visitedApps: appsHook.visitedApps,
			loading: appsHook.loading
		};
	}, [appsHook.visitedApps, appsHook.loading, cacheTimeout]);

	// Visited Sites data with caching
	const visitedSitesHook = useTimeDailyActivity('SITE');
	const visitedSitesData = useMemo(() => {
		const now = Date.now();
		const cache = cacheRef.current.visitedSites;

		// Return cached data if still valid
		if (cache.data.length > 0 && now - cache.timestamp < cacheTimeout) {
			return {
				visitedSites: cache.data,
				loading: cache.loading
			};
		}

		// Update cache with fresh data
		if (visitedSitesHook.visitedSites.length > 0 || !visitedSitesHook.loading) {
			cacheRef.current.visitedSites = {
				data: visitedSitesHook.visitedSites,
				timestamp: now,
				loading: visitedSitesHook.loading
			};
		}

		return {
			visitedSites: visitedSitesHook.visitedSites,
			loading: visitedSitesHook.loading
		};
	}, [visitedSitesHook.visitedSites, visitedSitesHook.loading, cacheTimeout]);

	// Cache invalidation function
	const invalidateCache = useCallback((tabType?: 'screenshots' | 'apps' | 'visitedSites') => {
		if (tabType) {
			cacheRef.current[tabType] = { data: [], timestamp: 0, loading: false };
		} else {
			// Invalidate all caches
			cacheRef.current = {
				tasks: { data: [], firstFiveTasks: [], remainingTasks: [], timestamp: 0, loading: false },
				screenshots: { data: [], timestamp: 0, loading: false },
				apps: { data: [], timestamp: 0, loading: false },
				visitedSites: { data: [], timestamp: 0, loading: false }
			};
		}
	}, []);

	// Get cache status for debugging
	const getCacheStatus = useCallback(() => {
		const now = Date.now();
		return {
			screenshots: {
				cached: cacheRef.current.screenshots.data.length > 0,
				age: now - cacheRef.current.screenshots.timestamp,
				valid: now - cacheRef.current.screenshots.timestamp < cacheTimeout
			},
			apps: {
				cached: cacheRef.current.apps.data.length > 0,
				age: now - cacheRef.current.apps.timestamp,
				valid: now - cacheRef.current.apps.timestamp < cacheTimeout
			},
			visitedSites: {
				cached: cacheRef.current.visitedSites.data.length > 0,
				age: now - cacheRef.current.visitedSites.timestamp,
				valid: now - cacheRef.current.visitedSites.timestamp < cacheTimeout
			}
		};
	}, [cacheTimeout]);

	return {
		// Tasks tab data - THE MAIN PERFORMANCE FIX
		tasks: tasksData,

		// Additional task data for compatibility
		profile,
		user,
		canSeeActivity: profile?.userProfile?.id === user?.id || user?.role?.name?.toUpperCase() == 'MANAGER',

		// Screenshots tab data
		screenshots: screenshotsData,

		// Apps tab data
		apps: appsData,

		// Visited Sites tab data
		visitedSites: visitedSitesData,

		// Utility functions
		invalidateCache,
		getCacheStatus,

		// Original hooks for backward compatibility
		originalHooks: {
			screenshots: screenshotsHook,
			apps: appsHook,
			visitedSites: visitedSitesHook
		}
	};
};
