/**
 * The sender signs and posts with the SDK only: exact bytes, the signature headers, no credential, no
 * cookie, no redirect; every answer maps to sent / failed / rejected, and the last 12 attempts are kept
 * in memory with the bytes that were sent.
 */
import { createPublicKey, verify } from 'node:crypto';
import { STATS_HEADERS } from '@ever-co/connect-sdk';
import { ephemeralIdentity } from './instance';
import { buildTeamsReport } from './report';
import { sendTeamsReport } from './sender';
import { MAX_KEPT_ATTEMPTS, reporterState, resetReporterState } from './state';

const NOW = new Date('2026-11-02T10:00:00Z');
const BASE = 'http://127.0.0.1:3989';

let info: jest.SpyInstance;
let warn: jest.SpyInstance;

beforeEach(() => {
	resetReporterState();
	info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
	warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	info.mockRestore();
	warn.mockRestore();
});

function answering(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
	return jest.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } }));
}

function report(final = false) {
	const identity = ephemeralIdentity();
	return {
		identity,
		report: buildTeamsReport({
			now: NOW,
			instanceId: identity.instanceId,
			installSource: 'self-hosted',
			country: 'ZZ',
			final,
			buildVersion: '1.4.2'
		})
	};
}

describe('sendTeamsReport', () => {
	it('posts exactly the signed bytes to /v1/stats/reports, with the signature headers and no credential', async () => {
		const fetch = answering(202);
		const { identity, report: body } = report();
		await expect(sendTeamsReport(body, identity, { baseUrl: BASE, now: NOW, fetch })).resolves.toEqual({
			kind: 'sent',
			status: 202
		});

		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`${BASE}/v1/stats/reports`);
		expect(init.method).toBe('POST');
		expect(init.redirect).not.toBe('follow');
		const headers = new Headers(init.headers);
		expect(headers.get('authorization')).toBeNull();
		expect(headers.get('cookie')).toBeNull();
		expect(headers.get(STATS_HEADERS.key)).toBe(identity.signer.publicKey);

		// The signature verifies over the exact bytes sent.
		const sent = Buffer.from(init.body as Uint8Array);
		const signature = Buffer.from(String(headers.get(STATS_HEADERS.signature)).replace(/^ed25519=/, ''), 'base64url');
		const publicKey = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: identity.signer.publicKey }, format: 'jwk' });
		expect(verify(null, sent, publicKey, signature)).toBe(true);

		// The operator's view keeps exactly those bytes.
		expect(reporterState().attempts[0]).toMatchObject({ payload: sent.toString('utf8'), http_status: 202, outcome: 'sent' });
		expect(String(info.mock.calls.at(-1)?.[0])).toBe('ever_stats.send outcome=sent status=202 final=false');
	});

	it.each([
		[429, { kind: 'failed', status: 429 }],
		[500, { kind: 'failed', status: 500 }],
		[503, { kind: 'failed', status: 503 }],
		[422, { kind: 'rejected', status: 422, keyMismatch: false }],
		[409, { kind: 'rejected', status: 409, keyMismatch: false }],
		[302, { kind: 'rejected', status: 302, keyMismatch: false }]
	])('maps %p to %p', async (status, expected) => {
		const fetch = answering(status, {}, status === 302 ? { location: 'https://elsewhere.example.test/' } : {});
		const { identity, report: body } = report();
		await expect(sendTeamsReport(body, identity, { baseUrl: BASE, now: NOW, fetch })).resolves.toMatchObject(expected);
		// A redirect is never followed.
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('maps 409 key_mismatch to a rejected send that resets the identity', async () => {
		const fetch = answering(409, { code: 'key_mismatch' }, { 'content-type': 'application/problem+json' });
		const { identity, report: body } = report();
		await expect(sendTeamsReport(body, identity, { baseUrl: BASE, now: NOW, fetch })).resolves.toEqual({
			kind: 'rejected',
			status: 409,
			keyMismatch: true
		});
	});

	it('maps a failed connection to a failed send with no status', async () => {
		const fetch = jest.fn(async () => {
			throw new TypeError('fetch failed');
		});
		const { identity, report: body } = report();
		await expect(sendTeamsReport(body, identity, { baseUrl: BASE, now: NOW, fetch })).resolves.toMatchObject({
			kind: 'failed',
			status: null
		});
		expect(reporterState().attempts[0]).toMatchObject({ outcome: 'failed', http_status: null });
	});

	it('sends nothing when the platform checks refuse the report', async () => {
		const fetch = answering(202);
		const { identity, report: body } = report();
		const tampered = { ...body, country: 'someone@example.com' };
		await expect(sendTeamsReport(tampered, identity, { baseUrl: BASE, now: NOW, fetch })).resolves.toEqual({
			kind: 'invalid'
		});
		expect(fetch).not.toHaveBeenCalled();
		expect(String(warn.mock.calls[0]?.[0])).toContain('stats_build_invalid');
		expect(String(warn.mock.calls[0]?.[0])).not.toContain('someone@example.com');
	});

	it('keeps the last 12 attempts, newest first', async () => {
		const fetch = answering(202);
		const { identity, report: body } = report();
		for (let index = 0; index < MAX_KEPT_ATTEMPTS + 3; index += 1) {
			await sendTeamsReport({ ...body, report_id: body.report_id }, identity, { baseUrl: BASE, now: NOW, fetch });
		}
		expect(reporterState().attempts).toHaveLength(MAX_KEPT_ATTEMPTS);
	});
});
