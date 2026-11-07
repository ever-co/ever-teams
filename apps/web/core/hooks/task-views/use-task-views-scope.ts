'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { userState } from '@/core/stores/user/user';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';

/** Whose views, in which team; `null` before those are known. */
export interface TaskViewsScope {
	tenantId: string;
	organizationId: string;
	userId: string;
	teamId: string;
}

export function useTaskViewsScope(): TaskViewsScope | null {
	const user = useAtomValue(userState);
	const team = useAtomValue(activeTeamState);
	const userId = user?.id ?? null;
	const teamId = team?.id ?? null;
	const recordScope = taskDiscussionScope();
	const tenantId = recordScope?.tenantId ?? null;
	const organizationId = recordScope?.organizationId ?? null;

	return useMemo(() => {
		if (!tenantId || !organizationId || !userId || !teamId) return null;
		return { tenantId, organizationId, userId, teamId };
	}, [organizationId, teamId, tenantId, userId]);
}

/** Whether the saved views are on for this deployment and the scope is known. */
export function useTaskViewsAvailable(): boolean {
	const scope = useTaskViewsScope();
	return isTaskViewsEnabled() && scope !== null;
}
