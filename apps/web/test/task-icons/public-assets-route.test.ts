/**
 * `/api/public-assets/<path>` is how a deployment that publishes no API origin to the browser still
 * gets the Gauzy task status / priority / size icons: it streams them from the origin this app's /api
 * routes already proxy to, instead of the `https://api.ever.team` the code used to fall back to.
 *
 * It is unauthenticated (Gauzy serves these files publicly), so what it must never become is a way to
 * fetch something else: the origin is server configuration, and every path segment must be a plain
 * file name ending in an image extension.
 */
jest.mock('@/core/constants/config/constants', () => ({
	GAUZY_API_SERVER_ORIGIN: 'http://gauzy-api:3000',
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

import { GET } from '@/app/api/public-assets/[...path]/route';

const ICON_PATH = ['ever-icons', 'task-statuses', 'open.svg'];
const UPSTREAM = 'http://gauzy-api:3000/public/ever-icons/task-statuses/open.svg';

const fetchMock = jest.fn();

function request(path: string[]) {
	return GET(new Request('http://localhost:3030/api/public-assets/x'), { params: Promise.resolve({ path }) });
}

function upstreamResponse(body: string, init: { status?: number; contentType?: string } = {}) {
	return new Response(body, {
		status: init.status ?? 200,
		headers: { 'content-type': init.contentType ?? 'image/svg+xml' }
	});
}

beforeEach(() => {
	fetchMock.mockReset();
	globalThis.fetch = fetchMock as unknown as typeof fetch;
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('GET /api/public-assets/[...path]', () => {
	it('streams the icon from the origin this app proxies to, never from an Ever host', async () => {
		fetchMock.mockResolvedValue(upstreamResponse('<svg/>'));

		const response = await request(ICON_PATH);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe(UPSTREAM);
		expect(UPSTREAM).not.toContain('ever.team');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/svg+xml');
		expect(response.headers.get('cache-control')).toContain('max-age=3600');
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		// An SVG served from this app's own origin could otherwise run script on a direct navigation.
		expect(response.headers.get('content-security-policy')).toContain("script-src 'none'");
		await expect(response.text()).resolves.toBe('<svg/>');
	});

	it.each([
		[[] as string[], 'no path'],
		[[''], 'an empty segment'],
		[['..', '..', 'etc', 'passwd'], 'a traversal'],
		[['.', 'x.svg'], 'a dot segment'],
		[['ever-icons', '..', 'x.svg'], 'a traversal in the middle'],
		[['https:', '', 'evil.example', 'a.svg'], 'another origin'],
		[['ever-icons', 'a/b.svg'], 'a slash inside a segment'],
		[['ever-icons', 'a\\b.svg'], 'a backslash inside a segment'],
		[['ever-icons', '.hidden.svg'], 'a dotfile'],
		[['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i.svg'], 'too many segments'],
		[['ever-icons', 'task-statuses', 'open.json'], 'a non-image extension'],
		[['ever-icons', 'task-statuses', 'open'], 'no extension']
	])('answers 404 without fetching anything for %p (%s)', async (path) => {
		const response = await request(path);

		expect(response.status).toBe(404);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		['the upstream answers 404', () => fetchMock.mockResolvedValue(upstreamResponse('nope', { status: 404 }))],
		['the upstream is unreachable', () => fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))],
		[
			'the upstream answers with an error page',
			() => fetchMock.mockResolvedValue(upstreamResponse('<html/>', { contentType: 'text/html' }))
		]
	])('answers 404 when %s', async (_name, arrange) => {
		arrange();

		await expect(request(ICON_PATH).then((response) => response.status)).resolves.toBe(404);
	});
});
