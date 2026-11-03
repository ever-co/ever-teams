import { clientIpOf } from '@/core/services/server/client-ip';

export interface AiRateLimit {
	surface: string;
	perUser: number;
	perIp: number;
	windowMs: number;
}

export interface RateLimitVerdict {
	allowed: boolean;
	retryAfterSeconds: number;
}

interface RateLimitStore {
	__everTeamsAiCalls?: Map<string, number[]>;
}

const store = globalThis as RateLimitStore;

/** Kept in process memory, like the provider pauses: each instance counts its own calls, no database write. */
function callsByKey() {
	if (!store.__everTeamsAiCalls) {
		store.__everTeamsAiCalls = new Map<string, number[]>();
	}
	return store.__everTeamsAiCalls;
}

function take(key: string, limit: number, windowMs: number): RateLimitVerdict {
	const now = Date.now();
	const windowStart = now - windowMs;
	const calls = callsByKey().get(key) ?? [];
	const recent = calls.filter((time) => time > windowStart);
	if (recent.length >= limit) {
		const oldest = recent[0];
		const waitMs = oldest + windowMs - now;
		const retryAfterSeconds = Math.max(Math.ceil(waitMs / 1000), 1);
		callsByKey().set(key, recent);
		return { allowed: false, retryAfterSeconds };
	}
	recent.push(now);
	callsByKey().set(key, recent);
	return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * The AI routes spend the deployment's quotas and money: each signed-in user, and each client address when the
 * deployment forwards it, gets a number of calls per window and per surface.
 */
export function takeAiCall(limit: AiRateLimit, userId: string, headers: Pick<Headers, 'get'>): RateLimitVerdict {
	const userVerdict = take(`${limit.surface}:user:${userId}`, limit.perUser, limit.windowMs);
	if (!userVerdict.allowed) {
		return userVerdict;
	}
	const ip = clientIpOf(headers);
	if (!ip) {
		return userVerdict;
	}
	return take(`${limit.surface}:ip:${ip}`, limit.perIp, limit.windowMs);
}

export function rateLimitedResponse(verdict: RateLimitVerdict) {
	return Response.json(
		{ error: 'rate_limited' },
		{ status: 429, headers: { 'retry-after': String(verdict.retryAfterSeconds) } }
	);
}
