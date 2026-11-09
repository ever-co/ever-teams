import { atom } from 'jotai';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export interface PendingPlanAddition {
	key: string;
	taskId: string;
	/** The team's copy of the task, to name it while it joins the plan; null when the team list does not hold it. */
	task: TTask | null;
	/** Null while the request may also create the day's plan. */
	planId: string | null;
	/**
	 * The id of the plan a creating request answered, once it has; the addition then matches that plan by id while
	 * it still counts as creating the day (`planId` stays null), so the day's placeholder stays until the plan lands.
	 */
	createdPlanId?: string | null;
	/** `YYYY-MM-DD`, as `getDailyPlanDay` writes plan days. */
	day: string | null;
	employeeId: string | null;
}

/** Tasks on their way into a daily plan: requested, and not yet in the plans read back from the server. */
export const pendingPlanAdditionsState = atom<PendingPlanAddition[]>([]);
