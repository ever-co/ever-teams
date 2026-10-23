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

describe('resolveRateLimitConfig: CLIENT_IP_HEADER', () => {
	it('is unset by default, which keeps req.ip as the key', () => {
		assert.equal(resolveRateLimitConfig({}).clientIpHeader, undefined);
		assert.equal(resolveRateLimitConfig({ CLIENT_IP_HEADER: '  ' }).clientIpHeader, undefined);
	});

	it('names the header in lower case', () => {
		assert.equal(resolveRateLimitConfig({ CLIENT_IP_HEADER: 'CF-Connecting-IP' }).clientIpHeader, 'cf-connecting-ip');
	});
});
