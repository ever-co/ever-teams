const mockServerFetch = jest.fn();

jest.mock('@/core/services/server/fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
			body,
			status: init?.status ?? 200,
			headers: init?.headers ?? {}
		})
	}
}));

import { GET } from './route';

describe('GET /api/changelog (proxy mode)', () => {
	beforeEach(() => mockServerFetch.mockReset());

	it("forwards one product's What's new listing to the Gauzy API", async () => {
		mockServerFetch.mockResolvedValue({ data: { items: [{ id: 'e1', platform: 'ever-teams' }], total: 1 } });

		const res = (await GET(
			new Request('http://app.test/api/changelog?platform=ever-teams&isFeature=false&tenantId=x')
		)) as unknown as { body: unknown; status: number };

		expect(mockServerFetch).toHaveBeenCalledWith({
			path: '/changelog?platform=ever-teams&isFeature=false',
			method: 'GET',
			init: { cache: 'no-store' }
		});
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ items: [{ id: 'e1', platform: 'ever-teams' }], total: 1 });
	});

	it('refuses a missing or malformed product key without calling the API', async () => {
		for (const query of [
			'',
			'?platform=',
			'?platform=ever teams',
			'?platform=../tenant',
			`?platform=${'x'.repeat(51)}`
		]) {
			const res = (await GET(new Request(`http://app.test/api/changelog${query}`))) as unknown as {
				status: number;
			};
			expect(res.status).toBe(400);
		}
		expect(mockServerFetch).not.toHaveBeenCalled();
	});

	it('answers an empty list with 502 when the API fails', async () => {
		mockServerFetch.mockRejectedValue(new Error('down'));

		const res = (await GET(new Request('http://app.test/api/changelog?platform=ever-teams'))) as unknown as {
			body: unknown;
			status: number;
		};

		expect(res.status).toBe(502);
		expect(res.body).toEqual({ items: [], total: 0 });
	});
});
