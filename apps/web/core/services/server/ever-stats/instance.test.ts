/**
 * The statistics identity: random and in memory by default, fixed when the operator pins both the id
 * and the key, off when only one of them is set. The key is never logged.
 */
import { generateKeyPairSync } from 'node:crypto';
import { generateStatsKey } from '@ever-co/connect-sdk';
import { loadStatsIdentity, seedOfConfiguredKey } from './instance';

const FIXED_ID = '3ddf1821-761d-4247-8f3d-e65e4bc66ac8';

let warn: jest.SpyInstance;
let info: jest.SpyInstance;

beforeEach(() => {
	delete (globalThis as { __everTeamsConfigWarnings?: Set<string> }).__everTeamsConfigWarnings;
	warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
	warn.mockRestore();
	info.mockRestore();
});

function logged(): string {
	return [...warn.mock.calls, ...info.mock.calls].map((call) => call.map(String).join(' ')).join('\n');
}

describe('statistics identity', () => {
	it('is a new random id and key per process when nothing is configured', () => {
		const first = loadStatsIdentity({});
		const second = loadStatsIdentity({});
		expect(first.state).toBe('ready');
		expect(second.state).toBe('ready');
		if (first.state !== 'ready' || second.state !== 'ready') return;
		expect(first.source).toBe('ephemeral');
		expect(first.instanceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(first.instanceId).not.toBe(second.instanceId);
		expect(first.signer.publicKey).not.toBe(second.signer.publicKey);
	});

	it('keeps the same id and public key across loads when both are pinned (32-byte seed)', () => {
		const { seed } = generateStatsKey();
		const env = { EVER_INSTANCE_ID: FIXED_ID, EVER_STATS_PRIVATE_KEY: Buffer.from(seed).toString('base64url') };
		const first = loadStatsIdentity(env);
		const second = loadStatsIdentity(env);
		expect(first).toMatchObject({ state: 'ready', source: 'fixed', instanceId: FIXED_ID });
		if (first.state !== 'ready' || second.state !== 'ready') throw new Error('expected a ready identity');
		expect(second.signer.publicKey).toBe(first.signer.publicKey);
		expect(second.keyId).toBe(first.keyId);
		expect(logged()).not.toContain(env.EVER_STATS_PRIVATE_KEY);
	});

	it('reads a PKCS#8 Ed25519 key (base64url or base64) to the same key as its seed', () => {
		const { privateKey } = generateKeyPairSync('ed25519');
		const der = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer;
		const seed = Buffer.from(privateKey.export({ format: 'jwk' }).d as string, 'base64url');
		const fromDer = loadStatsIdentity({ EVER_INSTANCE_ID: FIXED_ID, EVER_STATS_PRIVATE_KEY: der.toString('base64url') });
		const fromBase64 = loadStatsIdentity({ EVER_INSTANCE_ID: FIXED_ID, EVER_STATS_PRIVATE_KEY: der.toString('base64') });
		const fromSeed = loadStatsIdentity({ EVER_INSTANCE_ID: FIXED_ID, EVER_STATS_PRIVATE_KEY: seed.toString('base64url') });
		if (fromDer.state !== 'ready' || fromSeed.state !== 'ready' || fromBase64.state !== 'ready') {
			throw new Error('expected ready identities');
		}
		expect(fromDer.signer.publicKey).toBe(fromSeed.signer.publicKey);
		expect(fromBase64.signer.publicKey).toBe(fromSeed.signer.publicKey);
	});

	it('is off with stats_key_missing when only the id is set, and says so once', () => {
		expect(loadStatsIdentity({ EVER_INSTANCE_ID: FIXED_ID })).toEqual({ state: 'off', reason: 'stats_key_missing' });
		expect(loadStatsIdentity({ EVER_INSTANCE_ID: FIXED_ID })).toEqual({ state: 'off', reason: 'stats_key_missing' });
		expect(warn).toHaveBeenCalledTimes(1);
		expect(logged()).toContain('stats_key_missing');
	});

	it.each([
		['a key without an id', { EVER_STATS_PRIVATE_KEY: Buffer.alloc(32, 7).toString('base64url') }],
		['an id that is not a UUID v4', { EVER_INSTANCE_ID: 'host.example.com', EVER_STATS_PRIVATE_KEY: Buffer.alloc(32, 7).toString('base64url') }],
		['a key that is not Ed25519', { EVER_INSTANCE_ID: FIXED_ID, EVER_STATS_PRIVATE_KEY: 'bm90IGEga2V5' }],
		['a key with foreign characters', { EVER_INSTANCE_ID: FIXED_ID, EVER_STATS_PRIVATE_KEY: 'not a key!' }]
	])('is off with stats_key_invalid for %s, without logging the key', (_label, env) => {
		expect(loadStatsIdentity(env)).toEqual({ state: 'off', reason: 'stats_key_invalid' });
		expect(logged()).toContain('stats_key_invalid');
		expect(logged()).not.toContain((env as { EVER_STATS_PRIVATE_KEY: string }).EVER_STATS_PRIVATE_KEY);
	});

	it('refuses an RSA PKCS#8 key', () => {
		const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
		const der = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer;
		expect(seedOfConfiguredKey(der.toString('base64url'))).toBeNull();
	});
});
