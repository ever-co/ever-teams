/**
 * @jest-environment node
 */
const mockAuthenticatedGuard = jest.fn();
const mockMyPermissions = jest.fn();
const mockList = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockShare = jest.fn();
const mockUnshare = jest.fn();
const mockReadShared = jest.fn();

jest.mock('./guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('./requests/role-permissions', () => ({
	getMyRolePermissionsRequest: (...args: unknown[]) => mockMyPermissions(...args)
}));
jest.mock('./requests/saved-reports', () => ({
	listSavedReportsRequest: (...args: unknown[]) => mockList(...args),
	createSavedReportRequest: (...args: unknown[]) => mockCreate(...args),
	updateSavedReportRequest: (...args: unknown[]) => mockUpdate(...args),
	deleteSavedReportRequest: (...args: unknown[]) => mockDelete(...args),
	shareSavedReportRequest: (...args: unknown[]) => mockShare(...args),
	unshareSavedReportRequest: (...args: unknown[]) => mockUnshare(...args),
	readSharedReportRequest: (...args: unknown[]) => mockReadShared(...args)
}));

import { NextResponse } from 'next/server';
import { proxyListSavedReports, proxyReadSharedReport, proxySavedReportWrite } from './saved-report-proxy';

const SIGNED_IN = {
	$res: (data: unknown) => NextResponse.json(data, { status: 401 }),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

const SIGNED_OUT = { ...SIGNED_IN, user: null };

const SESSION = { bearer_token: 'session-token', tenantId: 'tenant-1' };

const MAY_TRACK = [{ permission: 'TIME_TRACKER', enabled: true }];

function request(path: string, method = 'GET', body?: unknown) {
	const init: RequestInit = { method };
	if (body !== undefined) {
		init.body = JSON.stringify(body);
		init.headers = { 'content-type': 'application/json' };
	}
	return new Request(`https://app.ever.team${path}`, init);
}

/** A Gauzy refusal, as serverFetch rejects with it: a rejected promise holding the API's body and status. */
function gauzyRefusal(body: Record<string, unknown>) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

describe('saved reports proxy routes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
		mockMyPermissions.mockResolvedValue({ data: MAY_TRACK });
	});

	it('lists the reports of the organization the request names, never cached', async () => {
		mockList.mockResolvedValue({ data: { items: [{ id: 'r1' }], total: 1 } });

		const response = await proxyListSavedReports(request('/api/saved-reports?organizationId=organization-2'));

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(mockList).toHaveBeenCalledWith({ ...SESSION, organizationId: 'organization-2' });
		expect(await response.json()).toEqual({ items: [{ id: 'r1' }], total: 1 });
	});

	it('refuses a signed-out caller and asks Gauzy nothing', async () => {
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_OUT);

		const response = await proxyListSavedReports(request('/api/saved-reports?organizationId=o'));

		expect(response.status).toBe(401);
		expect(mockList).not.toHaveBeenCalled();
	});

	it('refuses a caller without a permission the time reports are read with', async () => {
		mockMyPermissions.mockResolvedValue({
			data: [
				{ permission: 'ORG_PROJECT_VIEW', enabled: true },
				{ permission: 'TIME_TRACKER', enabled: false }
			]
		});

		const list = await proxyListSavedReports(request('/api/saved-reports?organizationId=o'));
		const share = await proxySavedReportWrite(request('/api/saved-reports/r1/share', 'POST', {}), 'share', 'r1');

		expect(list.status).toBe(403);
		expect(share.status).toBe(403);
		expect(mockList).not.toHaveBeenCalled();
		expect(mockShare).not.toHaveBeenCalled();
	});

	it('saves a report with the body sent and answers 201', async () => {
		const body = { tenantId: 'tenant-1', organizationId: 'organization-1', name: 'Client A' };
		mockCreate.mockResolvedValue({ data: { id: 'r1', name: 'Client A' } });

		const response = await proxySavedReportWrite(request('/api/saved-reports', 'POST', body), 'create');

		expect(response.status).toBe(201);
		expect(mockCreate).toHaveBeenCalledWith({ ...SESSION, body });
	});

	it('changes, deletes and turns off the link of one report by its id', async () => {
		mockUpdate.mockResolvedValue({ data: { id: 'r1', name: 'Renamed' } });
		mockDelete.mockResolvedValue({ data: undefined });
		mockUnshare.mockResolvedValue({ data: undefined });

		const update = await proxySavedReportWrite(
			request('/api/saved-reports/r1', 'PUT', { name: 'Renamed' }),
			'update',
			'r1'
		);
		const remove = await proxySavedReportWrite(request('/api/saved-reports/r1', 'DELETE'), 'delete', 'r1');
		const unshare = await proxySavedReportWrite(request('/api/saved-reports/r1/share', 'DELETE'), 'unshare', 'r1');

		expect(update.status).toBe(200);
		expect(mockUpdate).toHaveBeenCalledWith({ ...SESSION, id: 'r1', body: { name: 'Renamed' } });
		expect(remove.status).toBe(204);
		expect(mockDelete).toHaveBeenCalledWith({ ...SESSION, id: 'r1' });
		expect(unshare.status).toBe(204);
		expect(mockUnshare).toHaveBeenCalledWith({ ...SESSION, id: 'r1' });
	});

	it('gives the token of a new link back once, never cached', async () => {
		mockShare.mockResolvedValue({ data: { token: 'secret', sharedAt: 'now', shareExpiresAt: null } });

		const response = await proxySavedReportWrite(
			request('/api/saved-reports/r1/share', 'POST', { expiresAt: null }),
			'share',
			'r1'
		);

		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(mockShare).toHaveBeenCalledWith({ ...SESSION, id: 'r1', body: { expiresAt: null } });
	});

	it("passes Gauzy's refusal of a link asked from an API token session through as a 403", async () => {
		mockShare.mockRejectedValue(
			gauzyRefusal({
				statusCode: 403,
				message: 'Sharing a saved report is not available to a session started from an API token'
			})
		);

		const response = await proxySavedReportWrite(request('/api/saved-reports/r1/share', 'POST', {}), 'share', 'r1');

		expect(response.status).toBe(403);
		expect((await response.json()).message).toMatch(/API token/);
	});

	it('answers 400 for a dot segment as the report id, and asks Gauzy nothing', async () => {
		const response = await proxySavedReportWrite(request('/api/saved-reports/..', 'DELETE'), 'delete', '..');

		expect(response.status).toBe(400);
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it('keeps the 404 of an API without saved reports', async () => {
		mockList.mockRejectedValue(gauzyRefusal({ statusCode: 404, message: 'Cannot GET /api/saved-reports' }));

		const response = await proxyListSavedReports(request('/api/saved-reports?organizationId=o'));

		expect(response.status).toBe(404);
	});

	it('reads a shared report without a session, and passes the 404 of a link that does not work', async () => {
		mockReadShared.mockResolvedValueOnce({ data: { name: 'Report' } });
		mockReadShared.mockRejectedValueOnce(
			gauzyRefusal({ statusCode: 404, message: 'This report link does not work.' })
		);

		const found = await proxyReadSharedReport('token-1');
		const gone = await proxyReadSharedReport('token-2');

		expect(found.status).toBe(200);
		expect(found.headers.get('cache-control')).toBe('no-store');
		expect(mockReadShared).toHaveBeenCalledWith('token-1');
		expect(gone.status).toBe(404);
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
	});

	it('answers 400 for a dot segment as the token', async () => {
		const response = await proxyReadSharedReport('..');

		expect(response.status).toBe(400);
		expect(mockReadShared).not.toHaveBeenCalled();
	});
});
