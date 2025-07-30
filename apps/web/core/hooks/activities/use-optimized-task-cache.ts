import { useMemo, useRef, useCallback } from 'react';

import { TTask } from '@/core/types/schemas/task/task.schema';
interface TaskCacheEntry {
	tasks: TTask[];
	firstFiveTasks: TTask[];
	remainingTasks: TTask[];
	timestamp: number;
	tabKey: string;
}

interface UseOptimizedTaskCacheOptions {
	tasks: TTask[];
	activeTaskId?: string;
	tabKey: string; // For cache invalidation when switching tabs
	cacheTimeout?: number; // Cache timeout in milliseconds (default: 5 minutes)
}

interface OptimizedTaskData {
	firstFiveTasks: TTask[];
	remainingTasks: TTask[];
	totalCount: number;
	shouldShowAccordion: boolean;
}

/**
 * Custom hook for optimized task caching and data processing
 * Prevents recalculation when switching between tabs and provides intelligent caching
 */
export const useOptimizedTaskCache = ({
	tasks,
	activeTaskId,
	tabKey,
	cacheTimeout = 5 * 60 * 1000 // 5 minutes default
}: UseOptimizedTaskCacheOptions): OptimizedTaskData => {
	const cacheRef = useRef<Map<string, TaskCacheEntry>>(new Map());

	// Generate cache key based on unique task IDs, activeTaskId, and tabKey
	const cacheKey = useMemo(() => {
		// Create unique task IDs to avoid cache key collisions from duplicates
		const uniqueTaskIds = Array.from(new Set(tasks.map((t) => t.id)))
			.sort()
			.join(',');
		return `${tabKey}-${uniqueTaskIds}-${activeTaskId || 'none'}-${tasks.length}`;
	}, [tasks, activeTaskId, tabKey]);

	// Clean expired cache entries
	const cleanExpiredCache = useCallback(() => {
		const now = Date.now();
		const cache = cacheRef.current;

		for (const [key, entry] of cache.entries()) {
			if (now - entry.timestamp > cacheTimeout) {
				cache.delete(key);
			}
		}
	}, [cacheTimeout]);

	// Process tasks and return optimized data
	const optimizedData = useMemo((): OptimizedTaskData => {
		const cache = cacheRef.current;
		const now = Date.now();

		// Check if we have valid cached data
		const cachedEntry = cache.get(cacheKey);
		if (cachedEntry && now - cachedEntry.timestamp < cacheTimeout) {
			return {
				firstFiveTasks: cachedEntry.firstFiveTasks,
				remainingTasks: cachedEntry.remainingTasks,
				totalCount: cachedEntry.tasks.length,
				shouldShowAccordion: cachedEntry.remainingTasks.length > 0
			};
		}

		// Clean expired entries periodically
		cleanExpiredCache();

		// Filter out active task and remove duplicates based on task ID
		const uniqueTasksMap = new Map<string, TTask>();
		tasks.forEach((task) => {
			if (task.id !== activeTaskId && !uniqueTasksMap.has(task.id)) {
				uniqueTasksMap.set(task.id, task);
			}
		});

		const filteredTasks = Array.from(uniqueTasksMap.values());

		// Split tasks: first 5 and remaining (ensuring no overlap)
		const firstFiveTasks = filteredTasks.slice(0, 5);
		const remainingTasks = filteredTasks.slice(5);

		// Debug: Verify no duplicates in development
		if (process.env.NODE_ENV === 'development') {
			const firstIds = new Set(firstFiveTasks.map((t) => t.id));
			const remainingIds = new Set(remainingTasks.map((t) => t.id));
			const intersection = [...firstIds].filter((id) => remainingIds.has(id));

			if (intersection.length > 0) {
				console.warn('🐛 Duplicate task IDs found between first and remaining tasks:', intersection);
			}
		}

		// Cache the processed data
		const newCacheEntry: TaskCacheEntry = {
			tasks: filteredTasks,
			firstFiveTasks,
			remainingTasks,
			timestamp: now,
			tabKey
		};

		cache.set(cacheKey, newCacheEntry);

		// Limit cache size to prevent memory leaks
		if (cache.size > 50) {
			const oldestKey = cache.keys().next().value;
			if (oldestKey) {
				cache.delete(oldestKey);
			}
		}

		return {
			firstFiveTasks,
			remainingTasks,
			totalCount: filteredTasks.length,
			shouldShowAccordion: remainingTasks.length > 0
		};
	}, [cacheKey, tasks, activeTaskId, cacheTimeout, cleanExpiredCache]);

	return optimizedData;
};

/**
 * Hook for managing accordion state with persistence
 */
export const useAccordionState = () => {
	const accordionStateRef = useRef<{ [key: string]: boolean }>({});

	const getAccordionState = useCallback((key: string, defaultValue: boolean = false): boolean => {
		return accordionStateRef.current[key] ?? defaultValue;
	}, []);

	const setAccordionState = useCallback((key: string, isOpen: boolean) => {
		accordionStateRef.current[key] = isOpen;
	}, []);

	return { getAccordionState, setAccordionState };
};
