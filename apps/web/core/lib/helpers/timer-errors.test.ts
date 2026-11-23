import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	isDailyPlanRequiredRefusal,
	isNothingToStopRefusal,
	isTrackingOffRefusal,
	requiredTrackingFieldsMessageKeyOf,
	requiredTrackingFieldsOf
} from './timer-errors';

/** An Error carrying an HTTP status, as the API client throws it. */
function apiError(message: string, statusCode: number) {
	return Object.assign(new Error(message), { statusCode });
}

describe('isTrackingOffRefusal', () => {
	it.each([
		'The time tracking functionality has been disabled for you.',
		'Time tracking is turned off for you in this team.'
	])('recognizes the 403 Gauzy answers with "%s"', (message) => {
		expect(isTrackingOffRefusal(apiError(message, 403))).toBe(true);
	});

	it('leaves any other refusal to the generic message', () => {
		expect(isTrackingOffRefusal(apiError('Forbidden resource', 403))).toBe(false);
		expect(isTrackingOffRefusal(apiError('Time tracking is turned off for you in this team.', 500))).toBe(false);
		expect(isTrackingOffRefusal({ statusCode: 403, message: 'Time tracking is turned off' })).toBe(false);
	});
});

describe('a start refused for a field the organization requires', () => {
	const refusal = (fields?: string[]) => {
		const details = fields ? { fields } : undefined;
		return new ApiErrorService('Your organization requires it', 400, 'TRACKING_FIELD_REQUIRED', details);
	};

	it('reads the fields Gauzy names', () => {
		expect(requiredTrackingFieldsOf(refusal(['organizationTeamId', 'projectId']))).toEqual([
			'organizationTeamId',
			'projectId'
		]);
		expect(requiredTrackingFieldsOf(refusal())).toEqual([]);
	});

	it('leaves any other error to the other messages', () => {
		expect(requiredTrackingFieldsOf(new ApiErrorService('Bad request', 400, 'OTHER_CODE'))).toBeNull();
		expect(requiredTrackingFieldsOf(apiError('Bad request', 400))).toBeNull();
	});

	it('names what is missing in the message', () => {
		expect(requiredTrackingFieldsMessageKeyOf(['organizationTeamId', 'projectId'])).toBe(
			'timer.REQUIRED_TEAM_AND_PROJECT_MESSAGE'
		);
		expect(requiredTrackingFieldsMessageKeyOf(['organizationTeamId'])).toBe('timer.REQUIRED_TEAM_MESSAGE');
		expect(requiredTrackingFieldsMessageKeyOf(['projectId'])).toBe('timer.REQUIRED_PROJECT_MESSAGE');
		expect(requiredTrackingFieldsMessageKeyOf(['description'])).toBe('timer.REQUIRED_DETAILS_MESSAGE');
		expect(requiredTrackingFieldsMessageKeyOf([])).toBe('timer.REQUIRED_DETAILS_MESSAGE');
	});
});

describe('isNothingToStopRefusal', () => {
	/** The error the API client throws for an answer with this status. */
	const answeredWith = (status: number) =>
		ApiErrorService.fromAxiosError({
			message: `Request failed with status code ${status}`,
			status,
			response: { status, data: { statusCode: status, message: 'No running log found.' } }
		});

	it('recognizes the 406 a stop gets when no run is left to stop', () => {
		expect(isNothingToStopRefusal(answeredWith(406))).toBe(true);
	});

	it('leaves any other failure of the stop to its own handling', () => {
		expect(isNothingToStopRefusal(answeredWith(409))).toBe(false);
		expect(isNothingToStopRefusal(answeredWith(500))).toBe(false);
		expect(
			isNothingToStopRefusal(ApiErrorService.fromAxiosError({ message: 'Network Error', code: 'ERR_NETWORK' }))
		).toBe(false);
		expect(isNothingToStopRefusal(apiError('Not Acceptable', 406))).toBe(false);
	});
});

describe('a start refused because the team requires a daily plan (#5716)', () => {
	const refusal = (code?: string) =>
		ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 422',
			status: 422,
			response: {
				status: 422,
				data: {
					statusCode: 422,
					message: 'Your team requires a daily plan before you track time. Plan your day first.',
					code
				}
			}
		});

	it('is recognized by the code of the 422', () => {
		expect(isDailyPlanRequiredRefusal(refusal('DAILY_PLAN_REQUIRED'))).toBe(true);
	});

	it('leaves any other refusal to its own message', () => {
		expect(isDailyPlanRequiredRefusal(refusal('TRACKING_FIELD_REQUIRED'))).toBe(false);
		expect(isDailyPlanRequiredRefusal(refusal())).toBe(false);
		expect(isDailyPlanRequiredRefusal(new Error('Network Error'))).toBe(false);
	});
});
