/**
 * POST /api/timer/discard is the proxy-mode twin of Gauzy's POST /timesheet/timer/discard (ever-co/ever-gauzy#11935):
 * it discards the caller's running timer, then answers the timer status. The tenant and organization come from the
 * session; Gauzy's refusals (400 nothing runs, 403 with its code, 404 no such route, 409 another run) keep their status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockDiscardTimer = jest.fn();
const mockTimerStatus = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	...jest.requireActual('@/core/services/server/requests'),
	discardTimerRequest: (...args: unknown[]) => mockDiscardTimer(...args),
	getTimerStatusRequest: (...args: unknown[]) => mockTimerStatus(...args)
}));

import { POST } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function discardWith(body: unknown) {
	const request = new Request('http://localhost/api/timer/discard?todayStart=a&todayEnd=b', {
		method: 'POST',
		body: JSON.stringify(body)
	});
	return POST(request);
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockDiscardTimer.mockReset().mockResolvedValue({ data: undefined });
	mockTimerStatus.mockReset().mockResolvedValue({ data: { running: false, duration: 3600 } });
});

it("discards the session's running timer, naming the run the member saw, and answers the new status", async () => {
	const response = await discardWith({ timeLogId: 'log-1', tenantId: 'another-tenant' });

	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ running: false, duration: 3600 });
	expect(mockDiscardTimer).toHaveBeenCalledWith(
		{ tenantId: 'tenant-1', organizationId: 'organization-1', timeLogId: 'log-1' },
		'access-token'
	);
});

it('answers a null status, not a failure, when the status read after the discard fails', async () => {
	mockTimerStatus.mockRejectedValue(new Error('offline'));

	const response = await discardWith({ timeLogId: 'log-1' });

	expect(response.status).toBe(200);
	expect(await response.json()).toBeNull();
});

it('sends no log id when the member saw none', async () => {
	await discardWith({});

	expect(mockDiscardTimer.mock.calls[0][0]).toEqual({ tenantId: 'tenant-1', organizationId: 'organization-1' });
});

it('refuses a log id that is not a string, before calling Gauzy', async () => {
	const response = await discardWith({ timeLogId: 42 });

	expect(response.status).toBe(400);
	expect(mockDiscardTimer).not.toHaveBeenCalled();
});

it.each([
	[400, undefined],
	[403, 'TIMER_DISCARD_DISABLED'],
	[403, 'TIMER_DISCARD_TOO_LATE'],
	[404, undefined],
	[409, undefined]
])("passes Gauzy's %s refusal on with its body", async (statusCode, code) => {
	const body = { statusCode, message: 'refused', ...(code ? { code } : {}) };
	mockDiscardTimer.mockImplementation(() => gauzyRefusal(body));

	const response = await discardWith({ timeLogId: 'log-1' });

	expect(response.status).toBe(statusCode);
	expect(await response.json()).toEqual(body);
	expect(mockTimerStatus).not.toHaveBeenCalled();
});

it('lets the session check answer a signed-out caller', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (data: unknown) => Response.json({ message: data }, { status: 401 }),
		user: null
	});

	const response = await discardWith({});

	expect(response.status).toBe(401);
	expect(mockDiscardTimer).not.toHaveBeenCalled();
});
