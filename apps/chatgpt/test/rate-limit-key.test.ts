/**
 * POST /mcp is rate limited per caller. With TRUST_PROXY behind an ingress that passes X-Forwarded-For on, a caller
 * could rotate that header and never hit the limit; CLIENT_IP_HEADER names the edge's own header (cf-connecting-ip
 * behind Cloudflare) to key on instead.
 *
 * Run with `yarn workspace @ever-teams/chatgpt test` (Node's built-in test runner through tsx).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Keep the pino logger quiet; set before the modules below read the env.
process.env.LOG_LEVEL = 'silent';

const { resolveRateLimitConfig } = await import('../src/config/environment.js');
const { rateLimitKey } = await import('../src/server/chatgpt-app-server.js');

/** A request as Express sees it: `req.ip` follows X-Forwarded-For when TRUST_PROXY trusts the ingress. */
function request(headers: Record<string, string>) {
	const lower = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
	return {
		get: (name: string) => lower[name.toLowerCase()],
		ip: lower['x-forwarded-for']?.split(',')[0].trim() ?? '10.0.0.9',
		socket: { remoteAddress: '10.0.0.9' }
	} as Parameters<typeof rateLimitKey>[0];
}

describe('resolveRateLimitConfig: CLIENT_IP_HEADER', () => {
	it('is unset by default, which keeps req.ip as the key', () => {
		assert.equal(resolveRateLimitConfig({}).clientIpHeader, undefined);
		assert.equal(resolveRateLimitConfig({ CLIENT_IP_HEADER: '  ' }).clientIpHeader, undefined);
	});

	it('names the header in lower case', () => {
		assert.equal(resolveRateLimitConfig({ CLIENT_IP_HEADER: 'CF-Connecting-IP' }).clientIpHeader, 'cf-connecting-ip');
	});
});

describe('rateLimitKey', () => {
	it('keeps one key for one edge address while the caller rotates X-Forwarded-For', () => {
		const keys = ['1.1.1.1', '2.2.2.2', '3.3.3.3'].map((spoofed) =>
			rateLimitKey(request({ 'CF-Connecting-IP': '203.0.113.7', 'X-Forwarded-For': spoofed }), 'cf-connecting-ip')
		);

		assert.deepEqual(new Set(keys), new Set(['203.0.113.7']));
	});

	it('gives another edge address its own key', () => {
		assert.notEqual(
			rateLimitKey(request({ 'CF-Connecting-IP': '203.0.113.7' }), 'cf-connecting-ip'),
			rateLimitKey(request({ 'CF-Connecting-IP': '203.0.113.8' }), 'cf-connecting-ip')
		);
	});

	it('keys on req.ip without the setting, or when the header holds no IP', () => {
		assert.equal(rateLimitKey(request({ 'X-Forwarded-For': '1.1.1.1' })), '1.1.1.1');
		assert.equal(rateLimitKey(request({ 'CF-Connecting-IP': 'nope' }), 'cf-connecting-ip'), '10.0.0.9');
	});
});
