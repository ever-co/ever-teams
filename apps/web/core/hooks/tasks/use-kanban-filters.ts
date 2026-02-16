'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { applyAllFilters } from '@/core/lib/utils';
import { DEFAULT_ISSUES_STATE } from '@/core/constants/config/constants';

// ==================== HOOK ====================

/**
 * Hook that manages kanban filter state and applies filters to tasks.
 *
 * Extracted from useKanban to separate filtering concerns from board/column management.
 * This hook owns:
 * - Filter state (search, priority, sizes, labels, epics, issues, employee)
 * - Filter application logic (single-pass filtering with useMemo)
 *
 * @param tasks - The raw task list to filter
 * @param isDataLoading - Whether the upstream data is still loading
 * @returns Filtered tasks and all filter state setters
 */
export function useKanbanFilters(tasks: TTask[], isDataLoading: boolean) {
	// ==================== FILTER STATE ====================
	const [searchTasks, setSearchTasks] = useState('');
	const [labels, setLabels] = useState<string[]>([]);
	const [epics, setEpics] = useState<string[]>([]);
	const [issues, setIssues] = useState<TStatusItem>(DEFAULT_ISSUES_STATE);
	const [priority, setPriority] = useState<string[]>([]);
	const [sizes, setSizes] = useState<string[]>([]);
	const employee = useSearchParams().get('employee');

	// ==================== STABLE SETTER REFERENCES ====================
	// React setState is already stable, but we wrap setIssues for type safety
	const handleSetIssues = useCallback((updater: TStatusItem | ((prev: TStatusItem) => TStatusItem)) => {
		setIssues(updater);
	}, []);

	// ==================== FILTERED TASKS ====================
	const filteredTasks = useMemo(() => {
		if (isDataLoading) {
			return [];
		}

		return applyAllFilters(tasks, { search: searchTasks, priority, issueValue: issues.value, sizes, labels, epics, employee });
	}, [tasks, isDataLoading, searchTasks, priority, issues.value, sizes, labels, epics, employee]);

	return {
		filteredTasks,
		// Filter state (read)
		searchTasks,
		issues,
		// Filter state (write)
		setSearchTasks,
		setPriority,
		setLabels,
		setSizes,
		setIssues: handleSetIssues,
		setEpics
	};
}

/** Return type of useKanbanFilters for external typing */
export type TKanbanFilters = ReturnType<typeof useKanbanFilters>;

