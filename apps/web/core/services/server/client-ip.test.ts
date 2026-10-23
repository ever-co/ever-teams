/**
 * Gauzy sees every server-side call of this app as one address. With EVER_TEAMS_CLIENT_IP_SECRET set, each call
 * carries the browser's address and an HMAC proof Gauzy can verify, so its per-IP limits count real clients. Without
 * the secret nothing is sent.
 */
import { createHmac } from 'node:crypto';
import {
	CLIENT_IP_HEADER,
	CLIENT_IP_SIGNATURE_HEADER,
	CLIENT_IP_TIMESTAMP_HEADER,
	clientIpHeaders,
	clientIpOf,
	clientIpSecret,
	signClientIp
} from './client-ip';

const SECRET = 'a-shared-secret-of-at-least-32-characters';
const mockRequestHeaders = jest.fn();

jest.mock('next/headers', () => ({ headers: () => mockRequestHeaders() }));

describe('clientIpSecret', () => {
	it.each([
		['unset', undefined],
		['blank', '   '],
		['shorter than 32 characters', 'short-secret']
	])('is off when the secret is %s', (_label, value) => {
		expect(clientIpSecret({ EVER_TEAMS_CLIENT_IP_SECRET: value })).toBeNull();
	});

	it('is on with a secret of 32 characters or more', () => {
		expect(clientIpSecret({ EVER_TEAMS_CLIENT_IP_SECRET: SECRET })).toBe(SECRET);
	});
});

describe('clientIpOf', () => {
	it('reads only the configured header when one is named', () => {
		const headers = new Headers({ 'cf-connecting-ip': '203.0.113.7', 'x-real-ip': '10.0.0.5' });

		expect(clientIpOf(headers, { EVER_TEAMS_CLIENT_IP_HEADER: 'CF-Connecting-IP' })).toBe('203.0.113.7');
		const noCloudflare = new Headers({ 'x-real-ip': '10.0.0.5' });
		expect(clientIpOf(noCloudflare, { EVER_TEAMS_CLIENT_IP_HEADER: 'cf-connecting-ip' })).toBeNull();
	});

	it('reads no header at all when none is configured, x-real-ip and x-forwarded-for included', () => {
		// Behind some proxies a caller sets those: signing them would let callers pick their address
		const headers = new Headers({ 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '1.2.3.4, 198.51.100.9' });

		expect(clientIpOf(headers, {})).toBeNull();
	});

	it('reads an IPv6 address', () => {
		const headers = new Headers({ 'x-real-ip': '2001:db8::1' });

		expect(clientIpOf(headers, { EVER_TEAMS_CLIENT_IP_HEADER: 'x-real-ip' })).toBe('2001:db8::1');
	});

	it.each([['not-an-ip'], ['1.2.3.4:80'], ['']])('ignores %p, which is no IP address', (value) => {
		const headers = new Headers({ 'cf-connecting-ip': value });

		expect(clientIpOf(headers, { EVER_TEAMS_CLIENT_IP_HEADER: 'cf-connecting-ip' })).toBeNull();
	});
});

describe('signClientIp', () => {
	it('signs "<timestamp>.<address>" with HMAC-SHA256, the way Gauzy verifies it', () => {
		const signed = signClientIp('203.0.113.7', SECRET, 1_800_000_000);

		expect(signed).toEqual({
			[CLIENT_IP_HEADER]: '203.0.113.7',
			[CLIENT_IP_TIMESTAMP_HEADER]: '1800000000',
			[CLIENT_IP_SIGNATURE_HEADER]: createHmac('sha256', SECRET).update('1800000000.203.0.113.7').digest('hex')
		});
	});

	it('gives another signature for another address or another secret', () => {
		const base = signClientIp('203.0.113.7', SECRET, 1_800_000_000)[CLIENT_IP_SIGNATURE_HEADER];

		expect(signClientIp('203.0.113.8', SECRET, 1_800_000_000)[CLIENT_IP_SIGNATURE_HEADER]).not.toBe(base);
		expect(signClientIp('203.0.113.7', `${SECRET}x`, 1_800_000_000)[CLIENT_IP_SIGNATURE_HEADER]).not.toBe(base);
	});
});

describe('clientIpHeaders', () => {
	beforeEach(() => mockRequestHeaders.mockReset());

	const ON = { EVER_TEAMS_CLIENT_IP_SECRET: SECRET, EVER_TEAMS_CLIENT_IP_HEADER: 'cf-connecting-ip' };

	it.each([
		['without the secret', { EVER_TEAMS_CLIENT_IP_HEADER: 'cf-connecting-ip' }],
		['without a configured header', { EVER_TEAMS_CLIENT_IP_SECRET: SECRET }]
	])('sends nothing, and reads no request, %s', async (_label, env) => {
		expect(await clientIpHeaders(env)).toEqual({});
		expect(mockRequestHeaders).not.toHaveBeenCalled();
	});

	it("signs the request's client address with the secret", async () => {
		mockRequestHeaders.mockResolvedValue(new Headers({ 'cf-connecting-ip': '203.0.113.7' }));

		const sent = await clientIpHeaders(ON);

		expect(sent[CLIENT_IP_HEADER]).toBe('203.0.113.7');
		expect(sent[CLIENT_IP_SIGNATURE_HEADER]).toBe(
			createHmac('sha256', SECRET).update(`${sent[CLIENT_IP_TIMESTAMP_HEADER]}.203.0.113.7`).digest('hex')
		);
	});

	it('sends nothing outside a request (start-up, schedulers)', async () => {
		mockRequestHeaders.mockRejectedValue(new Error('`headers` was called outside a request scope'));

		expect(await clientIpHeaders(ON)).toEqual({});
	});

	it("lets Next's dynamic-rendering signal through", async () => {
		const dynamicUsage = Object.assign(new Error('Dynamic server usage'), { digest: 'DYNAMIC_SERVER_USAGE' });
		mockRequestHeaders.mockRejectedValue(dynamicUsage);

		await expect(clientIpHeaders(ON)).rejects.toBe(dynamicUsage);
	});
});
