import { isTrackingOffRefusal } from './timer-errors';

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
