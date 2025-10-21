'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { taskTimesheetState } from '@/core/stores/tasks/task-timesheet';
import { activityService } from '@/core/services/client/api/activities';
import { useAuthenticateUser } from '../auth';
import { useUserProfilePage } from '../users';
import { queryKeys } from '@/core/query/keys';

export function useTaskTimeSheets(id: string) {
	const { user } = useAuthenticateUser();
	const [taskTimesheets, setTaskTimesheets] = useAtom(taskTimesheetState);
	const activityFilter = useAtomValue(activityTypeState);
	const profile = useUserProfilePage();

	// Memoized parameters for React Query to prevent infinite loops
	const tenantId = useMemo(() => user?.tenantId ?? '', [user?.tenantId]);
	const organizationId = useMemo(() => user?.employee?.organizationId ?? '', [user?.employee?.organizationId]);

	// Memoized authorization check to prevent unnecessary re-renders
	const isAuthorized = useMemo(() => {
		return (
			activityFilter.member?.employeeId === user?.employee?.id || user?.role?.name?.toUpperCase() === 'MANAGER'
		);
	}, [activityFilter.member?.employeeId, user?.employee?.id, user?.role?.name]);
	const isEnabled = useMemo(() => {
		return !!(tenantId && organizationId && id && isAuthorized);
	}, [tenantId, organizationId, id, isAuthorized]);
	// React Query for task activities with proper enabled condition
	const { data: activitiesData, isLoading } = useQuery({
		queryKey: queryKeys.activities.byTask(id, tenantId, organizationId),
		queryFn: () =>
			activityService.getActivities({
				taskId: id
			}),
		enabled: isEnabled,
		staleTime: 1000 * 60 * 5, // 5 minutes - activities change frequently
		refetchOnWindowFocus: false
	});

	// Synchronize React Query data with Jotai store for backward compatibility
	useEffect(() => {
		if (activitiesData) {
			// Type assertion needed due to slight differences between TActivity and IActivity
			setTaskTimesheets(activitiesData as any);
		} else if (!isAuthorized) {
			setTaskTimesheets([]);
		}
	}, [activitiesData, isAuthorized]); // Only depend on data, not setter

	// Legacy function kept for backward compatibility - now uses React Query data
	const getTaskTimesheets = useCallback(() => {
		// React Query handles this automatically - this function is kept for backward compatibility
		// Data is already available in activitiesData and synchronized with taskTimesheets
		return activitiesData || [];
	}, [activitiesData]);

	return {
		// Data from React Query (preferred) with fallback to Jotai for backward compatibility
		taskTimesheets: activitiesData || taskTimesheets,

		// Legacy function kept for backward compatibility
		getTaskTimesheets,

		// Loading state from React Query
		loading: isLoading,

		// Legacy compatibility
		loadTaskStatsIObserverRef: profile.loadTaskStatsIObserverRef
	};
}
