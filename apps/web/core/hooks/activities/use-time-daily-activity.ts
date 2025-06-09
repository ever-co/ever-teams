'use client';

import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { activityTypeState } from '@/core/stores/timer/activity-type';
import { timeAppsState, timeVisitedSitesState } from '@/core/stores/timer/time-slot';

import { activityService } from '@/core/services/client/api/activities';
import { useAuthenticateUser } from '../auth';
import { queryKeys } from '@/core/query/keys';

export function useTimeDailyActivity(type?: string) {
	const { user } = useAuthenticateUser();
	const [visitedApps, setVisitedApps] = useAtom(timeAppsState);
	const activityFilter = useAtomValue(activityTypeState);
	const [visitedSites, setVisitedSites] = useAtom(timeVisitedSitesState);

	// State to track current title filter for dynamic queries
	const [currentTitle, setCurrentTitle] = useState<string | undefined>(undefined);

	// Memoized base parameters
	const baseParams = useMemo(() => {
		if (!user?.tenantId || !user?.employee?.organizationId) return null;

		const todayStart = moment().startOf('day').toDate();
		const todayEnd = moment().endOf('day').toDate();
		const employeeId = activityFilter.member ? activityFilter.member?.employeeId : user?.employee?.id;

		return {
			tenantId: user.tenantId,
			organizationId: user.employee.organizationId,
			employeeId: employeeId ?? '',
			todayEnd,
			todayStart,
			type
		};
	}, [user?.tenantId, user?.employee?.organizationId, user?.employee?.id, activityFilter.member?.employeeId, type]);

	// Check if user is authorized to view daily activities
	const isAuthorized = useMemo(() => {
		return (
			activityFilter.member?.employeeId === user?.employee?.id || user?.role?.name?.toUpperCase() === 'MANAGER'
		);
	}, [activityFilter.member?.employeeId, user?.employee?.id, user?.role?.name]);
	const isEnabled = useMemo(() => {
		return !!(baseParams && isAuthorized);
	}, [baseParams, isAuthorized]);

	// React Query for daily activities data with dynamic title
	const dailyActivitiesQuery = useQuery({
		queryKey: queryKeys.activities.daily(
			baseParams?.tenantId,
			baseParams?.organizationId,
			baseParams?.employeeId,
			baseParams?.todayStart.toISOString(),
			baseParams?.todayEnd.toISOString(),
			baseParams?.type,
			currentTitle
		),
		queryFn: async () => {
			if (!baseParams) {
				throw new Error('Daily activities parameters are required');
			}
			const response = await activityService.getDailyActivities({
				...baseParams,
				title: currentTitle
			});
			return response;
		},
		enabled: isEnabled,
		gcTime: 1000 * 60 * 15 // 15 minutes in cache
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (dailyActivitiesQuery.data && Array.isArray(dailyActivitiesQuery.data)) {
			// Cast TActivity[] to IActivity[] for compatibility with existing Jotai stores
			const activities = dailyActivitiesQuery.data as any[];
			if (type === 'APP') {
				setVisitedApps(activities);
			} else {
				setVisitedSites(activities);
			}
		} else if (!isAuthorized) {
			if (type === 'APP') {
				setVisitedApps([]);
			} else {
				setVisitedSites([]);
			}
		}
	}, [dailyActivitiesQuery.data, isAuthorized, type, setVisitedApps, setVisitedSites]);

	// Preserve exact interface - getVisitedApps function that triggers new API calls
	const getVisitedApps = useCallback(
		(title?: string) => {
			if (!isEnabled) {
				if (type === 'APP') {
					setVisitedApps([]);
				} else {
					setVisitedSites([]);
				}
				return;
			}

			// Update title state to trigger new React Query fetch
			setCurrentTitle(title);
		},
		[isEnabled, type, setVisitedApps, setVisitedSites]
	);

	// Auto-fetch on mount and dependency changes (without title initially)
	useEffect(() => {
		getVisitedApps();
	}, [getVisitedApps]);

	return {
		// Preserve exact interface names and behavior
		visitedApps,
		visitedSites,
		// visitedAppDetail,
		getVisitedApps,
		loading: dailyActivitiesQuery.isLoading
	};
}
