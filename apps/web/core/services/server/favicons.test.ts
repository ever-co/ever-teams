/**
 * @jest-environment node
 */
const mockGuardedFetch = jest.fn();

jest.mock('@/core/lib/chat/guarded-fetch', () => ({
	createGuardedFetch: () => (url: string, init: RequestInit) => mockGuardedFetch(url, init)
}));

import { faviconOf, imageTypeOf, linkedIconsOf } from './favicons';

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

	it('asks for /favicon.ico first, saying what asks: a site may refuse a request that does not', async () => {
		mockGuardedFetch.mockImplementation(async () => new Response(PNG, { status: 200 }));

		const favicon = await faviconOf('en.wikipedia.org');

		expect(favicon?.type).toBe('image/png');
		const [address, init] = mockGuardedFetch.mock.calls[0] as [string, RequestInit];
		expect(address).toBe('https://en.wikipedia.org/favicon.ico');
		expect(new Headers(init.headers).get('user-agent')).toContain('EverTeams-Favicons');
	});
});
