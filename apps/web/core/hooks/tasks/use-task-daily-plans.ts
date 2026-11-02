'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { dailyPlanService } from '@/core/services/client/api';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { plannedMembersOf, type PlannedMember } from '@/core/lib/utils/task-detail';
import { queryKeys } from '@/core/query/keys';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';
import { activeTeamState } from '@/core/stores';
import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';

const NO_MEMBERS: PlannedMember[] = [];

/** Shares useTeamDailyPlans' getPlansByTask key, so the invalidation that follows a plan change refreshes it. */
export function useTaskDailyPlans(taskId: string | null | undefined) {
	const activeTeam = useAtomValue(activeTeamState);
	const accessToken = useReactiveAccessTokenCookie();
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const teamId = activeTeam?.id;
	const scope = { tenantId, organizationId, teamId, accessToken };
	const hasScope = [tenantId, organizationId, teamId, accessToken].every(Boolean);
	const isEnabled = hasScope && Boolean(taskId);

	const plansQuery = useQuery({
		queryKey: queryKeys.dailyPlans.byTaskByScope(tenantId, organizationId, teamId, taskId),
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => dailyPlanService.getPlansByTask({ taskId: taskId as string, scope, signal }),
		enabled: isEnabled,
		gcTime: 1000 * 60 * 60
	});

	const plans = plansQuery.data?.items;
	const members = useMemo(() => {
		if (!plans) {
			return NO_MEMBERS;
		}
		return plannedMembersOf(plans);
	}, [plans]);

	return {
		members,
		isLoading: plansQuery.isLoading,
		isError: plansQuery.isError,
		refetch: plansQuery.refetch
	};
}
