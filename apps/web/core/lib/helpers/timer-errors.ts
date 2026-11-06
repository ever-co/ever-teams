import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { ApiErrorService } from '@/core/services/client/api-error.service';

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

const TRACKING_FIELD_REQUIRED = 'TRACKING_FIELD_REQUIRED';

/**
 * The request fields a start missed that the organization requires, from Gauzy's TRACKING_FIELD_REQUIRED refusal;
 * null for any other error.
 */
export function requiredTrackingFieldsOf(error: unknown): string[] | null {
	if (!ApiErrorService.isApiError(error)) {
		return null;
	}
	if (error.errorCode !== TRACKING_FIELD_REQUIRED) {
		return null;
	}
	const fields = error.details?.fields;
	if (!Array.isArray(fields)) {
		return [];
	}
	return fields;
}

/** The message that names what a refused start missed, in the words of the user who starts it. */
export function requiredTrackingFieldsMessageKeyOf(fields: ReadonlyArray<string>) {
	const missesTeam = fields.includes('organizationTeamId');
	const missesProject = fields.includes('projectId');
	const missesBoth = missesTeam && missesProject;
	if (missesBoth) {
		return 'timer.REQUIRED_TEAM_AND_PROJECT_MESSAGE';
	}
	if (missesTeam) {
		return 'timer.REQUIRED_TEAM_MESSAGE';
	}
	if (missesProject) {
		return 'timer.REQUIRED_PROJECT_MESSAGE';
	}
	return 'timer.REQUIRED_DETAILS_MESSAGE';
}
