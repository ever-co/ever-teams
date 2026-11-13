/**
 * The proxy of a file download (a PDF, a zip) streams the platform's answer back with the headers of a download.
 */
jest.mock('@/core/constants/config/constants', () => ({ GAUZY_API_SERVER_URL: 'https://api.example.com/api', TENANT_ID_COOKIE_NAME: 'tenant-id' }));
jest.mock('./request-cookies', () => ({
	requestCookies: () => ({ get: (name: string) => (name === 'tenant-id' ? 'tenant-1' : undefined) }),
	requestAccessToken: () => 'token-1'
}));

import { forwardDownloadToGauzy } from './forward-download-to-gauzy';

describe('forwardDownloadToGauzy', () => {
	const realFetch = global.fetch;
	afterEach(() => {
		global.fetch = realFetch;
	});

	const answer = (headers: Record<string, string>) => {
		global.fetch = jest.fn(async () => new Response('%PDF-1.7', { status: 200, headers })) as unknown as typeof fetch;
	};
	const download = () => forwardDownloadToGauzy(new Request('https://teams.example.com/api/plugins/docs/documents/p/export.pdf?subtree=true'), '/plugins/docs/documents/p/export.pdf');

	it('keeps the name, the type and the length of the file', async () => {
		answer({ 'content-type': 'application/pdf', 'content-length': '8', 'content-disposition': 'attachment; filename="a.pdf"' });
		const response = await download();
		expect(response.status).toBe(200);
		expect(response.headers.get('content-disposition')).toBe('attachment; filename="a.pdf"');
		expect(response.headers.get('content-length')).toBe('8');
		const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
		expect(url).toBe('https://api.example.com/api/plugins/docs/documents/p/export.pdf?subtree=true');
		expect(init.headers).toMatchObject({ authorization: 'Bearer token-1', 'tenant-id': 'tenant-1' });
	});

	it('drops the length of an encoded answer, which fetch hands over decoded', async () => {
		answer({ 'content-type': 'application/pdf', 'content-length': '3', 'content-encoding': 'gzip' });
		const response = await download();
		expect(response.headers.get('content-length')).toBeNull();
		expect(response.headers.get('content-type')).toBe('application/pdf');
	});
});
