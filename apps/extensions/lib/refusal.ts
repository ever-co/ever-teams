/** What the API client keeps of a failed call: status 0 when the API could not be reached. */
export interface ApiFailure {
	status: number;
	code?: string;
	message?: string;
	details?: { fields?: unknown };
}

/** The message to show for a failure: a key of the extension's messages, and the API's own words when it has some. */
export interface Refusal {
	key: string;
	reason?: string;
}

// Gauzy refuses a start when tracking is off for the employee with a 403 that names it
const TRACKING_OFF = /time tracking/i;

const CODE_KEYS: Readonly<Record<string, string>> = {
	DAILY_PLAN_REQUIRED: 'refusalPlanRequired',
	TASK_NOT_PLANNED: 'refusalTaskNotPlanned'
};

const STATUS_KEYS: Readonly<Record<number, string>> = {
	0: 'errorOffline',
	401: 'errorSessionExpired',
	409: 'errorTimerChangedElsewhere'
};

/** The message for a start the organization refused for missing fields, the same as the web's. */
function requiredFieldsKey(fields: unknown): string {
	if (!Array.isArray(fields)) {
		return 'refusalRequiredDetails';
	}
	const list: unknown[] = fields;
	const missesTeam = list.includes('organizationTeamId');
	const missesProject = list.includes('projectId');
	const missesBoth = missesTeam && missesProject;
	if (missesBoth) {
		return 'refusalRequiredTeamAndProject';
	}
	if (missesTeam) {
		return 'refusalRequiredTeam';
	}
	if (missesProject) {
		return 'refusalRequiredProject';
	}
	return 'refusalRequiredDetails';
}

/** The words to show for a failed call of the timer or the task list. */
export function refusalOf(failure: ApiFailure): Refusal {
	if (failure.code === 'TRACKING_FIELD_REQUIRED') {
		return { key: requiredFieldsKey(failure.details?.fields) };
	}
	const codeKey = CODE_KEYS[failure.code ?? ''];
	if (codeKey) {
		return { key: codeKey };
	}
	const isTrackingOff = failure.status === 403 && TRACKING_OFF.test(failure.message ?? '');
	if (isTrackingOff) {
		return { key: 'refusalTrackingOff' };
	}
	const statusKey = STATUS_KEYS[failure.status];
	if (statusKey) {
		return { key: statusKey };
	}
	const hasClientReason = failure.status >= 400 && failure.status < 500 && Boolean(failure.message);
	if (hasClientReason) {
		return { key: 'errorWithReason', reason: failure.message };
	}
	return { key: 'errorGeneric' };
}
