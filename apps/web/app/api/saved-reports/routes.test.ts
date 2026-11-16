/**
 * @jest-environment node
 */
/**
 * Proxy mode: a saved report is saved, changed, deleted, shared and unshared only from this app's own pages. The
 * writes read their body as JSON whatever its declared type, and a share needs none, so a form another site posts with
 * the session's cookies would otherwise reach Gauzy. What each write does past that is covered with the proxy
 * (`core/services/server/saved-report-proxy.test.ts`).
 */
const mockWrite = jest.fn();
const mockList = jest.fn();

jest.mock('@/core/services/server/saved-report-proxy', () => ({
	proxySavedReportWrite: (...args: unknown[]) => mockWrite(...args),
	proxyListSavedReports: (...args: unknown[]) => mockList(...args)
}));

import { NextResponse } from 'next/server';
import { APP_ORIGIN, FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { POST as createReport } from './route';
import { DELETE as deleteReport, PUT as updateReport } from './[id]/route';
import { DELETE as unshareReport, POST as shareReport } from './[id]/share/route';

const params = { params: Promise.resolve({ id: 'report-1' }) };

const WRITES = [
	['POST /api/saved-reports', 'POST', '/api/saved-reports', (req: Request) => createReport(req), ['create']],
	[
		'PUT /api/saved-reports/:id',
		'PUT',
		'/api/saved-reports/report-1',
		(req: Request) => updateReport(req, params),
		['update', 'report-1']
	],
	[
		'DELETE /api/saved-reports/:id',
		'DELETE',
		'/api/saved-reports/report-1',
		(req: Request) => deleteReport(req, params),
		['delete', 'report-1']
	],
	[
		'POST /api/saved-reports/:id/share',
		'POST',
		'/api/saved-reports/report-1/share',
		(req: Request) => shareReport(req, params),
		['share', 'report-1']
	],
	[
		'DELETE /api/saved-reports/:id/share',
		'DELETE',
		'/api/saved-reports/report-1/share',
		(req: Request) => unshareReport(req, params),
		['unshare', 'report-1']
	]
] as const;

function request(path: string, method: string, headers: Record<string, string> = {}) {
	return new Request(`${APP_ORIGIN}${path}`, { method, headers });
}

beforeEach(() => {
	jest.clearAllMocks();
	mockWrite.mockResolvedValue(NextResponse.json({ id: 'report-1' }, { status: 200 }));
});

describe.each(WRITES)('%s', (_route, method, path, send, write) => {
	it.each(FOREIGN_ORIGIN_HEADERS)('is refused from %s, before the session is read', async (_label, headers) => {
		const response = await send(request(path, method, headers));

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toMatchObject({ statusCode: 403 });
		expect(mockWrite).not.toHaveBeenCalled();
	});

	it("reaches the proxy from this app's own pages", async () => {
		const req = request(path, method, SAME_ORIGIN_HEADERS);

		const response = await send(req);

		expect(response.status).toBe(200);
		expect(mockWrite).toHaveBeenCalledWith(req, ...write);
	});

	it('reaches the proxy from a client that is no browser, which sends no Origin', async () => {
		await send(request(path, method));

		expect(mockWrite).toHaveBeenCalledTimes(1);
	});
});
