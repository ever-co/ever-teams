/**
 * The chat's custom (OpenAI-compatible) provider makes this server POST to a URL the user typed, so the
 * URL must name a public https endpoint: never this machine, the cluster or a private network.
 */
const mockLookup = jest.fn();

jest.mock('node:dns/promises', () => ({
	lookup: (...args: unknown[]) => mockLookup(...args)
}));

import { checkCustomBaseUrl } from './custom-base-url';

const PRODUCTION = { NODE_ENV: 'production' };
const DEVELOPMENT = { NODE_ENV: 'development' };

function resolvesTo(...addresses: string[]) {
	mockLookup.mockResolvedValue(addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })));
}

beforeEach(() => {
	mockLookup.mockReset();
	// Every host name resolves to a public address unless a test says otherwise, so a rejection below
	// comes from the URL itself, not from DNS.
	resolvesTo('93.184.215.14');
});

describe('checkCustomBaseUrl', () => {
	it.each([
		['plain http to a public host', 'http://api.example.com/v1'],
		['another scheme', 'ftp://api.example.com/v1'],
		['a relative URL', '/v1'],
		['an empty value', ''],
		['credentials in the URL', 'https://user:secret@api.example.com/v1'],
		['loopback', 'https://127.0.0.1/v1'],
		['loopback, short form', 'https://127.1/v1'],
		['loopback, decimal form', 'https://2130706433/v1'],
		['loopback, hex form', 'https://0x7f.0.0.1/v1'],
		['the unspecified address', 'https://0.0.0.0/v1'],
		['private 10/8', 'https://10.1.2.3/v1'],
		['private 172.16/12', 'https://172.16.0.1/v1'],
		['private 192.168/16', 'https://192.168.1.183:4873/v1'],
		['carrier-grade NAT 100.64/10', 'https://100.64.0.1/v1'],
		['cloud metadata (link-local)', 'https://169.254.169.254/latest/meta-data'],
		['IPv6 loopback', 'https://[::1]/v1'],
		['IPv6 unique local', 'https://[fd00::1]/v1'],
		['IPv6 link-local', 'https://[fe80::1]/v1'],
		['IPv4-mapped loopback', 'https://[::ffff:127.0.0.1]/v1'],
		['IPv4-mapped cloud metadata', 'https://[::ffff:a9fe:a9fe]/v1'],
		['NAT64 of a private address', 'https://[64:ff9b::a00:1]/v1'],
		['6to4 of a private address', 'https://[2002:c0a8:101::1]/v1'],
		['localhost', 'https://localhost:11434/v1'],
		['a *.localhost name', 'https://ollama.localhost/v1']
	])('rejects %s', async (_case, raw) => {
		await expect(checkCustomBaseUrl(raw, PRODUCTION)).resolves.toMatchObject({ ok: false });
	});

	it('rejects a value that is not a string', async () => {
		await expect(checkCustomBaseUrl({ href: 'https://api.example.com/v1' }, PRODUCTION)).resolves.toMatchObject({
			ok: false
		});
	});

	it('rejects a host name that resolves to a private address', async () => {
		resolvesTo('10.43.0.10');

		await expect(checkCustomBaseUrl('https://ever-teams-api.svc.example/v1', PRODUCTION)).resolves.toMatchObject({
			ok: false
		});
	});

	it('rejects a host name when any of its addresses is private', async () => {
		resolvesTo('93.184.215.14', '192.168.1.200');

		await expect(checkCustomBaseUrl('https://mixed.example.com/v1', PRODUCTION)).resolves.toMatchObject({
			ok: false
		});
	});

	it('rejects a host name that does not resolve', async () => {
		mockLookup.mockRejectedValue(
			Object.assign(new Error('getaddrinfo ENOTFOUND nowhere.example'), { code: 'ENOTFOUND' })
		);

		await expect(checkCustomBaseUrl('https://nowhere.example/v1', PRODUCTION)).resolves.toMatchObject({
			ok: false
		});
	});

	it('accepts a public https endpoint, checking every address of its host', async () => {
		resolvesTo('93.184.215.14', '2606:2800:21f:cb07:6820:80da:af6b:8b2c');

		await expect(checkCustomBaseUrl('https://api.example.com/v1/', PRODUCTION)).resolves.toEqual({
			ok: true,
			baseURL: 'https://api.example.com/v1',
			allowLoopback: false
		});
		expect(mockLookup).toHaveBeenCalledWith('api.example.com', expect.objectContaining({ all: true }));
	});

	it.each([
		['a public IPv4 literal', 'https://8.8.8.8/v1', 'https://8.8.8.8/v1'],
		['a public IPv6 literal', 'https://[2606:4700:4700::1111]/v1', 'https://[2606:4700:4700::1111]/v1']
	])('accepts %s', async (_case, raw, baseURL) => {
		await expect(checkCustomBaseUrl(raw, PRODUCTION)).resolves.toEqual({ ok: true, baseURL, allowLoopback: false });
	});

	describe('local development (NODE_ENV=development)', () => {
		it.each([
			['localhost over http', 'http://localhost:11434/v1', 'http://localhost:11434/v1'],
			['127.0.0.1 over http', 'http://127.0.0.1:1234/v1', 'http://127.0.0.1:1234/v1'],
			['::1 over http', 'http://[::1]:1234/v1', 'http://[::1]:1234/v1'],
			['localhost over https', 'https://localhost:8443/v1', 'https://localhost:8443/v1']
		])('accepts %s', async (_case, raw, baseURL) => {
			await expect(checkCustomBaseUrl(raw, DEVELOPMENT)).resolves.toEqual({
				ok: true,
				baseURL,
				allowLoopback: true
			});
		});

		it.each([
			['http to a public host', 'http://api.example.com/v1'],
			['a private address', 'http://10.0.0.5/v1'],
			['a private address over https', 'https://192.168.1.10/v1']
		])('still rejects %s', async (_case, raw) => {
			await expect(checkCustomBaseUrl(raw, DEVELOPMENT)).resolves.toMatchObject({ ok: false });
		});

		it('rejects plain http to localhost outside development', async () => {
			await expect(checkCustomBaseUrl('http://localhost:11434/v1', PRODUCTION)).resolves.toMatchObject({
				ok: false
			});
		});
	});

	describe('CHAT_CUSTOM_BASE_URL_ALLOWLIST', () => {
		const ALLOWLISTED = { ...PRODUCTION, CHAT_CUSTOM_BASE_URL_ALLOWLIST: ' llm.example.com, API.example.org ,' };

		it.each([
			['a listed host', 'https://llm.example.com/v1', 'https://llm.example.com/v1'],
			['a listed host in another letter case', 'https://API.Example.org/v1', 'https://api.example.org/v1']
		])('accepts %s', async (_case, raw, baseURL) => {
			await expect(checkCustomBaseUrl(raw, ALLOWLISTED)).resolves.toEqual({
				ok: true,
				baseURL,
				allowLoopback: false
			});
		});

		it('rejects a public host that is not listed', async () => {
			await expect(checkCustomBaseUrl('https://other.example.com/v1', ALLOWLISTED)).resolves.toMatchObject({
				ok: false
			});
		});

		it('rejects a subdomain of a listed host', async () => {
			await expect(checkCustomBaseUrl('https://evil.llm.example.com/v1', ALLOWLISTED)).resolves.toMatchObject({
				ok: false
			});
		});

		it('never lets a listed host reach a private address', async () => {
			resolvesTo('10.0.0.7');

			await expect(checkCustomBaseUrl('https://llm.example.com/v1', ALLOWLISTED)).resolves.toMatchObject({
				ok: false
			});
		});

		it('allows any public host when the list is blank', async () => {
			const blank = { ...PRODUCTION, CHAT_CUSTOM_BASE_URL_ALLOWLIST: ' , ' };

			await expect(checkCustomBaseUrl('https://api.example.com/v1', blank)).resolves.toMatchObject({ ok: true });
		});
	});
});
