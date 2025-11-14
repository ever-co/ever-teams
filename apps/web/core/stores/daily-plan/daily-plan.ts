import { atom } from 'jotai';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

/**
 * Team-wide daily plan list state
 *
 * This atom stores the paginated list of ALL daily plans for the active team.
 * It is shared across all components and represents the source of truth for team-wide plan data.
 *
 * NOTE_KEEP - This is a legitimate team-wide global state.
 * Per-employee daily plans are now derived from React Query in `useDailyPlan`
 * to avoid out-of-sync views and duplicated per-user global stores.
 * NOTE_MIGRATION - This file previously hosted many per-employee plan atoms
 * (today, past, future, outstanding, profile/my plans). Their replacements
 * now live in `useDailyPlan`, `useDateRange` and `filterDailyPlan`.
 */
export const dailyPlanListState = atom<PaginationResponse<TDailyPlan>>({
	items: [],
	total: 0
});
