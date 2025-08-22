import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { I_UserProfilePage } from '../users';
import { useDailyPlan, useLocalStorageState, useOutsideClick } from '@/core/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@/core/constants/config/constants';
import { estimatedTotalTime, getTotalTasks } from '@/core/components/tasks/daily-plan';
import intersection from 'lodash/intersection';
import { ITab } from '@/core/components/pages/profile/task-filters';
import { timeLogsDailyReportState, activeTeamManagersState, activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '../queries/user-user.query';

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
 * It returns an object with the current tab, a function to set the current tab, and an array of tabs
 * @param {I_UserProfilePage} profile - User profile page data containing task groups
 */
export function useTaskFilter(profile: I_UserProfilePage) {
	const t = useTranslations();
	// const defaultValue = useMemo(
	// 	() => (typeof window !== 'undefined' ? (window.localStorage.getItem('task-tab') as ITab) || null : 'worked'),
	// 	[]
	// );

	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const activeTeam = useAtomValue(activeTeamState);

	const { data: user } = useUserQuery();
	// const profileDailyPlans = useAtomValue(profileDailyPlanListState);
	const { todayPlan, outstandingPlans, profileDailyPlans } = useDailyPlan(profile?.member?.employee.id);
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

	// const [tab, setTab] = useState<ITab>(defaultValue || 'worked');
	const [tab, setTab] = useLocalStorageState<ITab>('task-tab', 'worked');
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
		if (dailyPlanSuggestionModalDate != new Date().toISOString().split('T')[0] && path.split('/')[1] == 'profile') {
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
