import { secondsToTime } from '../../../helpers/date';

/** A task's estimate written as the Time section writes durations, or nothing when the task has none. */
export function estimateTextOf(estimate: number | null | undefined): string | null {
	if (!estimate || estimate <= 0) {
		return null;
	}
	const { h, m } = secondsToTime(estimate);
	return `${h}h : ${m}m`;
}
