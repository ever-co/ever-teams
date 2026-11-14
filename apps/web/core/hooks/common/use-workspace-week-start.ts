'use client';

import { useAtomValue } from 'jotai';
import type { WeekStart } from '@/core/lib/utils/dashboard-period';
import { workspaceWeekStartState } from '@/core/stores/user/user-organizations';

/**
 * The first day of the week every week view, week picker, report and export of the workspace counts from: the day its
 * organization stores, Monday until the organization is read or when it stores none.
 */
export function useWorkspaceWeekStart(): WeekStart {
	return useAtomValue(workspaceWeekStartState);
}
