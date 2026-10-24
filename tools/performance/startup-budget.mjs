// Imported by the Cypress spec bundle as well as Node tooling: keep this module free of Node built-ins.

// The cold-start budget is held by the MEDIAN of the samples, so one or two samples slowed by a loaded
// shared runner do not fail the gate while a regression that slows most cold starts still does.
export const DEFAULT_SHELL_READY_BUDGET_MS = 8_000;

// Every single sample must still finish under this ceiling: it catches a pathological start (a hang, a
// request waterfall, a retry storm) that a median would hide. Loaded runners have produced samples up to
// ~10.2 s on code that measures 4-7 s otherwise; the shell-ready wait itself gives up at 20 s.
export const DEFAULT_SHELL_READY_CEILING_MS = 15_000;

function formatMs(value) {
	return value.toLocaleString('en-US');
}

/**
 * Evaluates the shell-ready timings of a set of cold samples: the median against `budgetMs` and every
 * sample against `ceilingMs`. A missing or non-positive timing is a failure and is left out of the median.
 *
 * @param {ReadonlyArray<{ index?: number; shellReadyMs: number }>} samples
 * @param {{ budgetMs?: number; ceilingMs?: number }} [options]
 * @returns {{ budgetMs: number; ceilingMs: number; medianMs: number | null; maxMs: number | null;
 *   samplesOverBudget: number; failures: string[] }} The summary, with `failures` empty when the samples pass.
 */
export function evaluateShellReady(
	samples,
	{ budgetMs = DEFAULT_SHELL_READY_BUDGET_MS, ceilingMs = DEFAULT_SHELL_READY_CEILING_MS } = {}
) {
	const failures = [];
	const valid = [];
	samples.forEach((sample, position) => {
		const label = `Sample ${sample.index ?? position + 1}`;
		// No coercion: `true` or a numeric string in a candidate file is malformed, not a fast start.
		const value = sample.shellReadyMs;
		if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
			failures.push(`${label}: shell-ready timing is missing or invalid.`);
			return;
		}
		valid.push(value);
		if (value > ceilingMs) {
			failures.push(
				`${label}: shell-ready ${formatMs(value)} ms exceeds the per-sample ceiling of ${formatMs(ceilingMs)} ms.`
			);
		}
	});

	const sorted = [...valid].sort((left, right) => left - right);
	// Upper middle for an even count, so a missing sample never makes the budget more lenient.
	const medianMs = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
	if (medianMs !== null && medianMs > budgetMs) {
		failures.push(
			`Median shell-ready ${formatMs(medianMs)} ms of ${sorted.length} cold samples (${valid
				.map(formatMs)
				.join(', ')} ms) exceeds ${formatMs(budgetMs)} ms.`
		);
	}

	return {
		budgetMs,
		ceilingMs,
		medianMs,
		maxMs: sorted.at(-1) ?? null,
		samplesOverBudget: valid.filter((value) => value > budgetMs).length,
		failures
	};
}
