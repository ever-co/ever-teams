/**
 * @jest-environment node
 */
/**
 * PUT /api/employee-notification/:id (#5722): the app's own API client adds the tenant and the organization to every
 * PUT body, and the route refused them, so opening a notification never marked it read in proxy mode.
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdateNotification = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/employee-notification', () => ({
	updateEmployeeNotificationRequest: (...args: unknown[]) => mockUpdateNotification(...args)
}));

import { PUT } from './route';

const NOTIFICATION_ID = '3f2a9d6e-5c1b-4e7a-9f0d-2b6c8a1e4d73';
const READ_AT = '2026-11-22T10:15:00.000Z';
const CLIENT_SCOPE = {
	tenantId: '0b9d1c7e-2a4f-4c3b-8e6d-1f5a7c9b3e20',
	organizationId: '7c4e2b1a-9d3f-4a6c-b8e5-0d2f6a1c9e47'
};

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-of-the-session'
};

function put(body: unknown) {
	const request = new Request(`https://app.example.com/api/employee-notification/${NOTIFICATION_ID}`, {
		method: 'PUT',
		headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
		body: JSON.stringify(body)
	});
	return PUT(request, { params: Promise.resolve({ id: NOTIFICATION_ID }) });
}

describe('PUT /api/employee-notification/:id', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
		mockUpdateNotification.mockResolvedValue({ data: { id: NOTIFICATION_ID, isRead: true } });
	});

	it("marks a notification read with the body the app's own client sends", async () => {
		const response = await put({ isRead: true, readAt: READ_AT, ...CLIENT_SCOPE });

		expect(response.status).toBe(200);
		expect(mockUpdateNotification).toHaveBeenCalledWith({
			id: NOTIFICATION_ID,
			data: { isRead: true, readAt: READ_AT },
			bearer_token: 'session-token',
			tenantId: 'tenant-of-the-session'
		});
	});

	it("keeps the session's tenant, whatever tenant the body names", async () => {
		await put({ isRead: true, tenantId: 'another-tenant' });

		const [sent] = mockUpdateNotification.mock.calls[0];
		expect(sent.tenantId).toBe('tenant-of-the-session');
		expect(sent.data).toEqual({ isRead: true });
	});

	it.each([
		['the text', { isRead: true, title: 'Changed' }],
		['the receiver', { isRead: true, receiverEmployeeId: 'someone-else', ...CLIENT_SCOPE }],
		['the type', { type: 'payment' }]
	])('still refuses a body that changes %s, without asking the API', async (_case, body) => {
		const response = await put(body);

		expect(response.status).toBe(400);
		expect(mockUpdateNotification).not.toHaveBeenCalled();
	});
});
