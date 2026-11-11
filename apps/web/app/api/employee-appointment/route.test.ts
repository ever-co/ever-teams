/**
 * /api/employee-appointment is the proxy-mode twin of Gauzy's employee appointment routes, which hold the scheduled
 * meetings (#5021): without NEXT_PUBLIC_GAUZY_API_SERVER_URL the browser lists, schedules and cancels meetings here.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET, POST } from './route';
import { DELETE } from './[id]/route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

const appointment = {
	id: 'appointment-1',
	agenda: 'Weekly sync',
	location: 'https://meet.ever.team/weekly-sync',
	startDateTime: '2026-11-12T10:00:00.000Z',
	endDateTime: '2026-11-12T10:30:00.000Z',
	employeeId: 'employee-1'
};

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json({ items: [appointment], total: 1 }, { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

describe('/api/employee-appointment', () => {
	it("lists the member's appointments with the query the client sent", async () => {
		const query = 'data=%7B%22findInput%22%3A%7B%22employeeId%22%3A%22employee-1%22%7D%7D';
		const response = await GET(new Request(`https://app.ever.team/api/employee-appointment?${query}`));

		expect(await response.json()).toEqual({ items: [appointment], total: 1 });
		const [upstreamUrl, init] = fetchMock.mock.calls[0];
		const upstream = new URL(String(upstreamUrl));
		expect(upstream.pathname).toMatch(/\/employee-appointment$/);
		expect(upstream.searchParams.get('data')).toBe('{"findInput":{"employeeId":"employee-1"}}');
		expect(init.method).toBe('GET');
	});

	it('schedules a meeting with the body as the client sent it', async () => {
		fetchMock.mockResolvedValue(Response.json(appointment, { status: 201 }));
		const body = { agenda: 'Weekly sync', location: appointment.location, tenantId: 'tenant-1' };

		const response = await POST(
			new Request('https://app.ever.team/api/employee-appointment', {
				method: 'POST',
				body: JSON.stringify(body)
			})
		);

		expect(await response.json()).toEqual(appointment);
		const [upstreamUrl, init] = fetchMock.mock.calls[0];
		expect(new URL(String(upstreamUrl)).pathname).toMatch(/\/employee-appointment$/);
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual(body);
	});

	it('refuses a body that is not an object without asking Gauzy', async () => {
		const response = await POST(
			new Request('https://app.ever.team/api/employee-appointment', { method: 'POST', body: '[1]' })
		);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("answers Gauzy's refusal with its status", async () => {
		const forbidden = { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' };
		fetchMock.mockResolvedValue(Response.json(forbidden, { status: 403 }));

		const response = await POST(
			new Request('https://app.ever.team/api/employee-appointment', { method: 'POST', body: '{"agenda":"x"}' })
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual(forbidden);
	});

	it('cancels one appointment by its id', async () => {
		fetchMock.mockResolvedValue(Response.json({ raw: [], affected: 1 }, { status: 200 }));

		const response = await DELETE(new Request('https://app.ever.team/api/employee-appointment/appointment-1'), {
			params: Promise.resolve({ id: 'appointment-1' })
		});

		expect(await response.json()).toEqual({ raw: [], affected: 1 });
		const [upstreamUrl, init] = fetchMock.mock.calls[0];
		expect(new URL(String(upstreamUrl)).pathname).toMatch(/\/employee-appointment\/appointment-1$/);
		expect(init.method).toBe('DELETE');
	});

	it('answers 401 without a session', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ $res: jest.fn(), user: null, status: 401 });

		const response = await GET(new Request('https://app.ever.team/api/employee-appointment'));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
