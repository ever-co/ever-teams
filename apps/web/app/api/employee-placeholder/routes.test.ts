/**
 * @jest-environment node
 */
/**
 * Proxy mode: members without an account are added, invited to claim their time and merged only from this app's own
 * pages. The proxy reads each body as JSON whatever its declared type, so a form another site posts with the session's
 * cookies would otherwise reach Gauzy. What each route does past that is covered with the proxy
 * (`core/services/server/employee-placeholder-proxy.test.ts`).
 */
const mockCreate = jest.fn();
const mockCreateMany = jest.fn();
const mockClaim = jest.fn();
const mockMerge = jest.fn();

jest.mock('@/core/services/server/employee-placeholder-proxy', () => ({
	proxyCreateEmployeePlaceholder: (...args: unknown[]) => mockCreate(...args),
	proxyCreateEmployeePlaceholders: (...args: unknown[]) => mockCreateMany(...args),
	proxyClaimEmployeePlaceholder: (...args: unknown[]) => mockClaim(...args),
	proxyMergeEmployeePlaceholder: (...args: unknown[]) => mockMerge(...args)
}));

import { NextResponse } from 'next/server';
import { APP_ORIGIN, FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { POST as createPlaceholder } from './route';
import { POST as createPlaceholders } from './bulk/route';
import { POST as claimPlaceholder } from './[id]/claim/route';
import { POST as mergePlaceholder } from './[id]/merge/route';

const PLACEHOLDER_ID = '3db49a7e-69d2-471a-9495-3b69ece6fc54';

const params = { params: Promise.resolve({ id: PLACEHOLDER_ID }) };

const POSTS = [
	['/api/employee-placeholder', (req: Request) => createPlaceholder(req), mockCreate, []],
	['/api/employee-placeholder/bulk', (req: Request) => createPlaceholders(req), mockCreateMany, []],
	[
		`/api/employee-placeholder/${PLACEHOLDER_ID}/claim`,
		(req: Request) => claimPlaceholder(req, params),
		mockClaim,
		[PLACEHOLDER_ID]
	],
	[
		`/api/employee-placeholder/${PLACEHOLDER_ID}/merge`,
		(req: Request) => mergePlaceholder(req, params),
		mockMerge,
		[PLACEHOLDER_ID]
	]
] as const;

function post(path: string, headers: Record<string, string> = {}) {
	return new Request(`${APP_ORIGIN}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify({ firstName: 'Amina' })
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	for (const [, , proxy] of POSTS) {
		proxy.mockResolvedValue(NextResponse.json({ id: 'employee-amina' }, { status: 201 }));
	}
});

describe.each(POSTS)('POST %s', (path, send, proxy, args) => {
	it.each(FOREIGN_ORIGIN_HEADERS)(
		'is refused from %s, before the body or the session is read',
		async (_label, headers) => {
			const req = post(path, headers);

			const response = await send(req);

			expect(response.status).toBe(403);
			await expect(response.json()).resolves.toMatchObject({ statusCode: 403 });
			expect(proxy).not.toHaveBeenCalled();
			expect(req.bodyUsed).toBe(false);
		}
	);

	it("reaches the proxy from this app's own pages", async () => {
		const req = post(path, SAME_ORIGIN_HEADERS);

		const response = await send(req);

		expect(response.status).toBe(201);
		expect(proxy).toHaveBeenCalledWith(req, ...args);
	});

	it('reaches the proxy from a client that is no browser, which sends no Origin', async () => {
		await send(post(path));

		expect(proxy).toHaveBeenCalledTimes(1);
	});
});
