/**
 * @jest-environment node
 */
const mockGuardedFetch = jest.fn();

jest.mock('@/core/lib/chat/guarded-fetch', () => ({
	createGuardedFetch: () => (url: string, init: RequestInit) => mockGuardedFetch(url, init)
}));

import { FaviconsBusyError, faviconOf, imageTypeOf, linkedIconsOf } from './favicons';

const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('imageTypeOf', () => {
	it('reads the raster formats a favicon comes in from their first bytes', () => {
		expect(imageTypeOf(bytes(0x00, 0x00, 0x01, 0x00))).toBe('image/x-icon');
		expect(imageTypeOf(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
		expect(imageTypeOf(bytes(0x47, 0x49, 0x46, 0x38))).toBe('image/gif');
		expect(imageTypeOf(bytes(0xff, 0xd8, 0xff))).toBe('image/jpeg');
		expect(imageTypeOf(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp');
	});

	it('refuses an SVG, a page or anything else, whatever the site said it was', () => {
		expect(imageTypeOf(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
		expect(imageTypeOf(new TextEncoder().encode('<!doctype html><html></html>'))).toBeNull();
		expect(imageTypeOf(new Uint8Array())).toBeNull();
	});
});

describe('linkedIconsOf', () => {
	it("lists a page's icons in its order, without SVG ones or inline data", () => {
		const html = [
			'<link rel="stylesheet" href="/main.css">',
			'<link rel="icon" type="image/svg+xml" href="/icon.svg">',
			'<link rel="shortcut icon" href="/favicon-32.png">',
			"<link href='https://cdn.example.com/touch.png' rel='apple-touch-icon'>",
			'<link rel="icon" href="data:image/png;base64,AAAA">',
			'<LINK REL=icon HREF=/legacy.ico>'
		].join('\n');

		expect(linkedIconsOf(html)).toEqual(['/favicon-32.png', 'https://cdn.example.com/touch.png', '/legacy.ico']);
	});

	it('keeps four at most', () => {
		const html = Array.from({ length: 6 }, (_, index) => `<link rel="icon" href="/icon-${index}.png">`).join('');

		expect(linkedIconsOf(html)).toHaveLength(4);
	});
});

describe('faviconOf', () => {
	const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

	beforeEach(() => {
		mockGuardedFetch.mockReset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('reads the icons a large home page links at its start, without the rest of the page', async () => {
		const page = '<html><head><link rel="icon" href="/brand.png"></head><body>' + 'x'.repeat(300 * 1024);
		mockGuardedFetch.mockImplementation(async (address: string) => {
			if (address.endsWith('/favicon.ico')) return new Response(null, { status: 404 });
			if (address.endsWith('/brand.png')) return new Response(PNG, { status: 200 });
			return new Response(page, { status: 200 });
		});

		const favicon = await faviconOf('large.example.com');

		expect(favicon?.type).toBe('image/png');
		expect(mockGuardedFetch.mock.calls.map(([address]) => address)).toEqual([
			'https://large.example.com/favicon.ico',
			'https://large.example.com/',
			'https://large.example.com/brand.png'
		]);
	});

	it('reaches out for eight hosts at once, lets 64 wait, and refuses more without remembering them', async () => {
		jest.useFakeTimers();
		// Sites that keep the connection open until each lookup's deadline
		mockGuardedFetch.mockImplementation(
			(_address: string, init: RequestInit) =>
				new Promise((_resolve, reject) => {
					const abort = () => reject(new Error('aborted'));
					if (init.signal?.aborted) return abort();
					init.signal?.addEventListener('abort', abort);
				})
		);

		const lookups = Array.from({ length: 72 }, (_, index) => faviconOf(`busy-${index}.example.com`));
		await jest.advanceTimersByTimeAsync(0);

		expect(mockGuardedFetch).toHaveBeenCalledTimes(8);
		await expect(faviconOf('one-too-many.example.com')).rejects.toBeInstanceOf(FaviconsBusyError);

		// Each wave of eight lets the next eight start, until every lookup has ended
		for (let wave = 0; wave < 9; wave += 1) {
			await jest.advanceTimersByTimeAsync(10_000);
		}
		await expect(Promise.all(lookups)).resolves.toHaveLength(72);
		// The refused host was not remembered as missing: it is asked again once there is room
		mockGuardedFetch.mockImplementation(async () => new Response(PNG, { status: 200 }));
		await expect(faviconOf('one-too-many.example.com')).resolves.toEqual(
			expect.objectContaining({ type: 'image/png' })
		);
	});

	it('lets a site go when the whole lookup has not answered in ten seconds', async () => {
		jest.useFakeTimers();
		// A site that keeps the connection open: only the lookup's deadline ends the request
		mockGuardedFetch.mockImplementation(
			(_address: string, init: RequestInit) =>
				new Promise((_resolve, reject) => {
					const abort = () => reject(new Error('aborted'));
					if (init.signal?.aborted) return abort();
					init.signal?.addEventListener('abort', abort);
				})
		);

		const lookup = faviconOf('slow.example.com');
		await jest.advanceTimersByTimeAsync(10_000);

		await expect(lookup).resolves.toBeNull();
		expect(mockGuardedFetch.mock.calls.every(([, init]) => init.signal instanceof AbortSignal)).toBe(true);
	});

	it('asks for /favicon.ico first, saying what asks: a site may refuse a request that does not', async () => {
		mockGuardedFetch.mockImplementation(async () => new Response(PNG, { status: 200 }));

		const favicon = await faviconOf('en.wikipedia.org');

		expect(favicon?.type).toBe('image/png');
		const [address, init] = mockGuardedFetch.mock.calls[0] as [string, RequestInit];
		expect(address).toBe('https://en.wikipedia.org/favicon.ico');
		expect(new Headers(init.headers).get('user-agent')).toContain('EverTeams-Favicons');
	});
});
