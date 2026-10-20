export const DEFAULT_SHELL_READY_BUDGET_MS: 8000;
export const DEFAULT_SHELL_READY_CEILING_MS: 15000;

export type ShellReadyEvaluation = {
	budgetMs: number;
	ceilingMs: number;
	medianMs: number | null;
	maxMs: number | null;
	samplesOverBudget: number;
	failures: string[];
};

export function evaluateShellReady(
	samples: ReadonlyArray<{ index?: number; shellReadyMs: number }>,
	options?: { budgetMs?: number; ceilingMs?: number }
): ShellReadyEvaluation;
