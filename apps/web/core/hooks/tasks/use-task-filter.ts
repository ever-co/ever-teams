import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { I_UserProfilePage } from '../users';
import { useDailyPlan, useLocalStorageState, useOutsideClick } from '@/core/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@/core/constants/config/constants';
import { estimatedTotalTime, getTotalTasks } from '@/core/components/tasks/daily-plan';
import intersection from 'lodash/intersection';
import { ITab } from '@/core/components/pages/profile/task-filters';
import { timeLogsDailyReportState, activeTeamManagersState, activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '../queries/user-user.query';
import { getTodayString } from '@/core/lib/utils';

type IStatusType = 'status' | 'size' | 'priority' | 'label';
type FilterType = 'status' | 'search' | undefined;
type StatusFilter = { [x in IStatusType]: string[] };

type ITabs = {
	tab: ITab;
	name: string;
	count?: number;
	description: string;
};

/**
 * Options for the useTaskFilter hook
 */
export type UseTaskFilterOptions = {
	/**
	 * If true, uses localStorage to persist tab state (default: true for profile page)
	 * If false, uses local component state (recommended for UserTeamCard)
	 */
	persistState?: boolean;
	/**
	 * Default tab to use when persistState is false.
	 * Note: This option is only effective when persistState is false.
	 * When persistState is true, the tab defaults to 'worked' via localStorage.
	 * Can be 'auto' to automatically select based on daily plans availability.
	 */
	defaultTab?: ITab | 'auto';
};

/**
 * It returns an object with the current tab, a function to set the current tab, and an array of tabs
 * @param {I_UserProfilePage} profile - User profile page data containing task groups
 * @param {UseTaskFilterOptions} options - Optional configuration for state persistence
 */
export function useTaskFilter(profile: I_UserProfilePage, options: UseTaskFilterOptions = {}) {
	const { persistState = true, defaultTab = 'worked' } = options;
	const t = useTranslations();
	// const defaultValue = useMemo(
	// 	() => (typeof window !== 'undefined' ? (window.localStorage.getItem('task-tab') as ITab) || null : 'worked'),
	// 	[]
	// );

	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const activeTeam = useAtomValue(activeTeamState);

	const { data: user } = useUserQuery();

	// Correct employee ID selection based on context (auth user vs profile user)
	// Following the pattern from user-employee-id-management.md guide
	const targetEmployeeId = useMemo(() => {
		return profile?.isAuthUser
			? (user?.employee?.id ?? user?.employeeId ?? '')
			: (profile?.member?.employeeId ?? profile?.member?.employee?.id ?? '');
	}, [
		profile?.isAuthUser,
		user?.employee?.id,
		user?.employeeId,
		profile?.member?.employeeId,
		profile?.member?.employee?.id
	]);

	const { todayPlan, outstandingPlans, profileDailyPlans } = useDailyPlan(targetEmployeeId);
	const timeLogsDailyReport = useAtomValue(timeLogsDailyReportState);
	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);
	const canSeeActivity = useMemo(
		() => profile?.userProfile?.id === user?.id || isManagerConnectedUser !== -1,
		[isManagerConnectedUser, profile?.userProfile?.id, user?.id]
	);
	const path = usePathname();

	// Persisted tab state (for profile page - uses localStorage)
	const [persistedTab, setPersistedTab] = useLocalStorageState<ITab>('task-tab', 'worked');

	// Local tab state (for UserTeamCard - isolated, no localStorage)
	const [localTab, setLocalTab] = useState<ITab>(() => {
		// If defaultTab is 'auto', calculate the smart default
		if (defaultTab === 'auto') {
			// Check if user has daily plans with tasks
			const hasDailyPlanTasks = profileDailyPlans?.items?.some((plan) => plan.tasks && plan.tasks.length > 0);
			// Show daily plans if available, otherwise default to assigned tasks
			return hasDailyPlanTasks ? 'dailyplan' : 'assigned';
		}
		return defaultTab;
	});

	// Track if user has manually selected a tab (to avoid overwriting their choice on data refetch)
	const hasUserSelectedTabRef = useRef(false);

	// Wrapper for setLocalTab that tracks user selection
	const setLocalTabWithTracking = useCallback((newTab: ITab | ((prev: ITab) => ITab)) => {
		hasUserSelectedTabRef.current = true;
		setLocalTab(newTab);
	}, []);

	// Use persisted or local state based on options
	const tab = persistState ? persistedTab : localTab;
	const setTab = persistState ? setPersistedTab : setLocalTabWithTracking;

	// For 'auto' mode: Update tab when daily plans data is loaded (only on initial load)
	// This handles the case where profileDailyPlans is undefined on initial render
	const hasInitializedAutoTab = useMemo(() => {
		return defaultTab === 'auto' && !persistState;
	}, [defaultTab, persistState]);

	useEffect(() => {
		// Only auto-select tab if:
		// 1. We're in 'auto' mode with non-persisted state
		// 2. User hasn't manually selected a tab yet
		// 3. Daily plans data is available
		if (hasInitializedAutoTab && profileDailyPlans?.items && !hasUserSelectedTabRef.current) {
			const hasDailyPlanTasks = profileDailyPlans.items.some((plan) => plan.tasks && plan.tasks.length > 0);
			// Show daily plans if user has them, otherwise default to assigned tasks
			setLocalTab(hasDailyPlanTasks ? 'dailyplan' : 'assigned');
		}
	}, [hasInitializedAutoTab, profileDailyPlans?.items, setLocalTab]);

	const [filterType, setFilterType] = useState<FilterType>(undefined);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>({} as StatusFilter);

	const [appliedStatusFilter, setAppliedStatusFilter] = useState<StatusFilter>({} as StatusFilter);

	const [taskName, setTaskName] = useState('');
	/*
	 * TASK FILTERING LOGIC WITH DAILY PLANS INTEGRATION
	 *
	 * Original Problem: The dailyplan tab always returned an empty array ([])
	 * with a "Change this soon" comment, making the daily plans functionality
	 * completely non-functional in the task filter system.
	 *
	 * Solution: Implemented proper daily plans task extraction using:
	 * - profileDailyPlans?.items?.flatMap() to flatten all tasks from all plans
	 * - Null-safe operations with optional chaining and fallback to empty array
	 * - Added profileDailyPlans?.items to dependency array for proper reactivity
	 *
	 * Impact: The dailyplan tab now correctly displays all tasks from user's
	 * daily plans, enabling the full daily plans workflow in the UI.
	 */

	const tasksFiltered: { [x in ITab]: TTask[] } = useMemo(
		() => ({
			unassigned: profile.tasksGrouped.unassignedTasks,
			assigned: profile.tasksGrouped.assignedTasks,
			worked: profile.tasksGrouped.workedTasks,
			stats: [],

			// Changed from empty array [] to extract tasks from daily plans
			// Extract all tasks from all daily plans and flatten into single array
			// flatMap: [plan1.tasks, plan2.tasks, ...] → [task1, task2, task3, ...]
			dailyplan: profileDailyPlans?.items?.flatMap((plan) => plan.tasks || []) || []
		}),
		[
			profile?.tasksGrouped?.assignedTasks,
			profile?.tasksGrouped?.unassignedTasks,
			profile?.tasksGrouped?.workedTasks,
			profileDailyPlans?.items // Added dependency for daily plans reactivity
		]
	);

	const tasks = useMemo(() => tasksFiltered[tab] || [], [tab, tasksFiltered]);
	const dailyPlanSuggestionModalDate = window && window?.localStorage.getItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);

	const outclickFilterCard = useOutsideClick<HTMLDivElement>(() => {
		if (filterType === 'search' && taskName.trim().length === 0) {
			setFilterType(undefined);
		} else if (filterType === 'status') {
			const hasStatus = (Object.keys(statusFilter) as IStatusType[]).some((skey) => {
				return statusFilter[skey] && statusFilter[skey].length > 0;
			});
			!hasStatus && setFilterType(undefined);
		}
	});

	const tabs: ITabs[] = [
		{
			tab: 'assigned',
			name: t('common.ASSIGNED'),
			description: t('task.tabFilter.ASSIGNED_DESCRIPTION'),
			count: profile?.tasksGrouped?.assignedTasks?.length || 0
		},
		{
			tab: 'unassigned',
			name: t('common.UNASSIGNED'),
			description: t('task.tabFilter.UNASSIGNED_DESCRIPTION'),
			count: profile?.tasksGrouped?.unassignedTasks?.length || 0
		}
	];

	// For tabs on profile page, display "Worked" and "Daily Plan" only for the logged in user or managers
	if (activeTeam?.shareProfileView || canSeeActivity) {
		tabs.push({
			tab: 'dailyplan',
			name: t('common.DAILYPLAN' as DottedLanguageObjectStringPaths),
			description: t('task.tabFilter.DAILYPLAN_DESCRIPTION' as DottedLanguageObjectStringPaths),
			count: isNaN(profile?.tasksGrouped?.planned) ? 0 : profile?.tasksGrouped?.planned
		});
		tabs.push({
			tab: 'stats',
			name: 'Stats',
			description: 'This tab shows all stats',
			count: timeLogsDailyReport.length
		});
		tabs.unshift({
			tab: 'worked',
			name: t('common.WORKED'),
			description: t('task.tabFilter.WORKED_DESCRIPTION'),
			count: profile?.tasksGrouped?.workedTasks?.length || 0
		});
	}

	// useEffect(() => {
	// 	window.localStorage.setItem('task-tab', tab);
	// }, [tab]);

	useEffect(() => {
		setTaskName('');
	}, [filterType]);

	const toggleFilterType = useCallback(
		(type: NonNullable<FilterType>) => {
			setFilterType((flt) => {
				return flt === type ? undefined : type;
			});
		},
		[setFilterType]
	);

	const onChangeStatusFilter = useCallback(
		(type: IStatusType, value: string[]) => {
			return setStatusFilter((state) => {
				return {
					...state,
					[type]: value
				};
			});
		},
		[setStatusFilter]
	);

	// Set the tab to assigned if user has not planned tasks (if outstanding is empty) (on first load)
	useEffect(() => {
		if (dailyPlanSuggestionModalDate != getTodayString() && path.split('/')[1] == 'profile') {
			if (estimatedTotalTime(outstandingPlans).totalTasks) {
				setTab('dailyplan');
			} else {
				if (!getTotalTasks(todayPlan)) {
					if (profile?.tasksGrouped?.assignedTasks?.length) {
						setTab('assigned');
					} else {
						setTab('unassigned');
					}
				}
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Reset status applied filter status when filter changed
	useEffect(() => {
		if (filterType !== 'status') {
			setAppliedStatusFilter({} as StatusFilter);
		}
	}, [filterType]);

	const onResetStatusFilter = useCallback(() => {
		setStatusFilter({} as StatusFilter);
		setAppliedStatusFilter({} as StatusFilter);
	}, [setStatusFilter]);

	/**
	 * Apply filter status filter
	 */
	const applyStatusFilter = useCallback(() => {
		setAppliedStatusFilter(statusFilter);
	}, [statusFilter]);

	const $tasks = useMemo(() => {
		const n = taskName.trim().toLowerCase();
		const statusFilters = appliedStatusFilter;

		return tasks
			.filter((task) => {
				return n ? task.title.toLowerCase().includes(n) : true;
			})
			.filter((task) => {
				const keys = Object.keys(statusFilters) as IStatusType[];

				return keys
					.filter((k) => statusFilters[k].length > 0)
					.every((k) => {
						return k === 'label'
							? intersection(
									statusFilters[k],
									task['tags']?.map((item) => item.name)
								).length === statusFilters[k].length
							: statusFilters[k].includes(task[k] as string);
					});
			});
	}, [tasks, taskName, appliedStatusFilter]);

	return {
		tab,
		setTab,
		tabs,
		filterType,
		toggleFilterType,
		tasksFiltered: $tasks,
		taskName,
		setTaskName,
		statusFilter,
		onChangeStatusFilter,
		onResetStatusFilter,
		applyStatusFilter: applyStatusFilter,
		tasksGrouped: profile?.tasksGrouped,
		outclickFilterCard,
		profileDailyPlans
	};
}
