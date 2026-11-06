import { ApiErrorService } from '@/core/services/client/api-error.service';
import { isTrackingOffRefusal, requiredTrackingFieldsMessageKeyOf, requiredTrackingFieldsOf } from './timer-errors';

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
