import { apiRefusalResponse } from './api-refusal-response';

/** What serverFetch throws for an answer that is not 2xx: a rejected promise of the API's error body. */
function refusalOf(body: unknown) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

describe('apiRefusalResponse', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("passes the API's refusal on with the status it names", async () => {
		const unauthorized = { message: 'Unauthorized', statusCode: 401 };

		const response = await apiRefusalResponse(refusalOf(unauthorized), 'POST /auth/signin-email-password');

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual(unauthorized);
	});

	it.each([
		['names no status', { message: 'Invite does not exist' }],
		['names a status that is no error', { message: 'Odd', statusCode: 200 }]
	])('answers 400 for a refusal that %s', async (_case, body) => {
		const response = await apiRefusalResponse(refusalOf(body), 'POST /invite/accept');

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual(body);
	});

	it.each([
		['the API cannot be reached', new TypeError('fetch failed')],
		['the API answered something that is no JSON object', refusalOf('Bad Gateway')]
	])('answers 502 and logs the route when %s', async (_case, error) => {
		const response = await apiRefusalResponse(error, 'POST /auth/signin-email-password');

		expect(response.status).toBe(502);
		expect(console.error).toHaveBeenCalledWith(
			'[WEB][API] POST /auth/signin-email-password: no usable answer from the Gauzy API',
			error
		);
	});
});
