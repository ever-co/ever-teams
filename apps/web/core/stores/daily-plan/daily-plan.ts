import { atom } from 'jotai';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

/**
 * Team-wide daily plan list state
 *
 * This atom stores the paginated list of ALL daily plans for the active team.
 * It is shared across all components and represents the source of truth for team-wide plan data.
 *
 * NOTE_KEEP - This is a legitimate team-wide global state
 */
export const dailyPlanListState = atom<PaginationResponse<TDailyPlan>>({
	items: [],
	total: 0
});
