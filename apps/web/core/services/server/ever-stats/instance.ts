import { createPrivateKey, randomUUID } from 'node:crypto';
import { generateStatsKey, statsKeyId, statsSignerFromSeed, type StatsSigner } from '@ever-co/connect-sdk';
import { warnOnce } from '@/core/lib/ever-platform/env';

/**
 * The anonymous statistics identity of this web app process: an opaque id and the Ed25519 key its
 * reports are signed with.
 *
 * - Neither `EVER_INSTANCE_ID` nor `EVER_STATS_PRIVATE_KEY` set: a random id and a new key, kept in
 *   this process's memory only (each process, and each restart, is a new series).
 * - Both set: that id (a UUID v4) and that key (base64url or base64 of the 32-byte Ed25519 seed, or
 *   of the PKCS#8 DER document), so every replica and every restart reports as one installation.
 * - Only the id: off (`stats_key_missing`). A key without an id, or a key that cannot be read: off
 *   (`stats_key_invalid`).
 *
 * The id is never derived from a URL, a host name or any other setting, and the key is never logged.
 */

type Env = Record<string, string | undefined>;

export type StatsIdentity =
	| {
			readonly state: 'ready';
			readonly instanceId: string;
			readonly signer: StatsSigner;
			readonly keyId: string;
			readonly source: 'fixed' | 'ephemeral';
	  }
	| { readonly state: 'off'; readonly reason: 'stats_key_missing' | 'stats_key_invalid' };

export type ReadyStatsIdentity = Extract<StatsIdentity, { state: 'ready' }>;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BASE64 = /^[A-Za-z0-9+/_-]+$/;

const blank = (value: string | undefined): value is undefined => value === undefined || value.trim() === '';

/** The text without its trailing `=` padding (a loop: no regular expression to backtrack). */
function withoutPadding(text: string): string {
	let end = text.length;
	while (end > 0 && text[end - 1] === '=') end -= 1;
	return text.slice(0, end);
}

/** The 32-byte seed of a configured key, or `null` when it is not a usable Ed25519 private key. */
export function seedOfConfiguredKey(raw: string): Uint8Array | null {
	const text = withoutPadding(raw.trim());
	if (!BASE64.test(text)) return null;
	const bytes = Buffer.from(text.replace(/\+/g, '-').replace(/\//g, '_'), 'base64url');
	if (bytes.length === 32) return new Uint8Array(bytes);
	try {
		const key = createPrivateKey({ key: bytes, format: 'der', type: 'pkcs8' });
		if (key.asymmetricKeyType !== 'ed25519') return null;
		const d = key.export({ format: 'jwk' }).d;
		if (typeof d !== 'string') return null;
		const seed = Buffer.from(d, 'base64url');
		return seed.length === 32 ? new Uint8Array(seed) : null;
	} catch {
		return null;
	}
}

function ready(instanceId: string, signer: StatsSigner, source: 'fixed' | 'ephemeral'): ReadyStatsIdentity {
	return { state: 'ready', instanceId, signer, keyId: statsKeyId(signer.publicKey), source };
}

/** A new random identity, in memory only. */
export function ephemeralIdentity(): ReadyStatsIdentity {
	return ready(randomUUID(), generateStatsKey().signer, 'ephemeral');
}

/** The identity the environment asks for (see the module comment). */
export function loadStatsIdentity(env: Env = process.env as Env): StatsIdentity {
	const id = env.EVER_INSTANCE_ID;
	const key = env.EVER_STATS_PRIVATE_KEY;
	if (blank(id) && blank(key)) return ephemeralIdentity();
	if (blank(key)) {
		warnOnce(
			'ever-stats:stats_key_missing',
			'ever_stats: stats_key_missing (EVER_INSTANCE_ID is set without EVER_STATS_PRIVATE_KEY): no report is sent.'
		);
		return { state: 'off', reason: 'stats_key_missing' };
	}
	const instanceId = (id ?? '').trim();
	const seed = UUID_V4.test(instanceId) ? seedOfConfiguredKey(key) : null;
	if (!seed) {
		warnOnce(
			'ever-stats:stats_key_invalid',
			'ever_stats: stats_key_invalid (EVER_INSTANCE_ID must be a lowercase UUID v4 and EVER_STATS_PRIVATE_KEY an Ed25519 private key): no report is sent.'
		);
		return { state: 'off', reason: 'stats_key_invalid' };
	}
	return ready(instanceId, statsSignerFromSeed(seed), 'fixed');
}
