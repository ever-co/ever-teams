import { errorStatusOf } from '@/core/lib/utils/error-feedback';

// Gauzy's start refusals when tracking is off for the employee or for the team both name it
const TRACKING_OFF_REFUSAL = /time tracking/i;

/** A start Gauzy refused because tracking is off: its 403 alone reads like a role problem. */
export function isTrackingOffRefusal(error: unknown): boolean {
	const isForbidden = errorStatusOf(error) === 403;
	if (!isForbidden) {
		return false;
	}
	if (!(error instanceof Error)) {
		return false;
	}
	return TRACKING_OFF_REFUSAL.test(error.message);
}
