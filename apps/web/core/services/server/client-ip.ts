import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

/**
 * The browser's IP address, forwarded to Gauzy with the server-side calls this app makes for it.
 *
 * Gauzy sees every request of this app's server as coming from one address, so its per-IP limits (sign-in attempts,
 * password reset, invites, e-mail verification) count every Ever Teams user together. With a shared secret set on
 * both sides (`EVER_TEAMS_CLIENT_IP_SECRET`, at least 32 characters), each call carries the browser's address and an
 * HMAC proof, and Gauzy counts per real client. Gauzy trusts the address only with a valid, recent proof. Without
 * the secret nothing is sent.
 *
 * Wire format (Gauzy verifies the same):
 * - `X-Ever-Client-IP`: the address (IPv4 or IPv6)
 * - `X-Ever-Client-IP-Timestamp`: Unix seconds when it was signed (Gauzy accepts about 5 minutes either way)
 * - `X-Ever-Client-IP-Signature`: hex HMAC-SHA256 of `<timestamp>.<address>` with the shared secret
 *
 * Where the address comes from: the header named by `EVER_TEAMS_CLIENT_IP_HEADER` (behind Cloudflare,
 * `cf-connecting-ip`), otherwise `x-real-ip`, otherwise the last `x-forwarded-for` entry (the one the nearest proxy
 * added). Name only a header that the proxy in front of this app always sets itself, never one a client can send.
 */
export const CLIENT_IP_HEADER = 'X-Ever-Client-IP';
export const CLIENT_IP_TIMESTAMP_HEADER = 'X-Ever-Client-IP-Timestamp';
export const CLIENT_IP_SIGNATURE_HEADER = 'X-Ever-Client-IP-Signature';

const MIN_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

/** The shared secret, or null when the feature is off (unset, or too short to be a real secret). */
export function clientIpSecret(env: Env = process.env): string | null {
	const secret = env.EVER_TEAMS_CLIENT_IP_SECRET?.trim();
	return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

/** The browser's address from the request headers (see the module doc), or null when none is a valid IP. */
export function clientIpOf(headers: Pick<Headers, 'get'>, env: Env = process.env): string | null {
	const configured = env.EVER_TEAMS_CLIENT_IP_HEADER?.trim().toLowerCase();
	const candidate = configured
		? headers.get(configured)
		: (headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',').pop());
	const ip = candidate?.trim();
	return ip && isIP(ip) ? ip : null;
}

/** The three headers that carry `ip` to Gauzy, signed at `nowSeconds`. */
export function signClientIp(ip: string, secret: string, nowSeconds: number): Record<string, string> {
	const timestamp = String(nowSeconds);
	const signature = createHmac('sha256', secret).update(`${timestamp}.${ip}`).digest('hex');
	return {
		[CLIENT_IP_HEADER]: ip,
		[CLIENT_IP_TIMESTAMP_HEADER]: timestamp,
		[CLIENT_IP_SIGNATURE_HEADER]: signature
	};
}

/**
 * The signed client-IP headers for a call made while handling a request, or none: the feature is off, the call runs
 * outside a request (start-up, schedulers, the proxy), or no valid address was found.
 */
export async function clientIpHeaders(env: Env = process.env): Promise<Record<string, string>> {
	const secret = clientIpSecret(env);
	if (!secret) return {};

	let ip: string | null;
	try {
		const { headers } = await import('next/headers');
		ip = clientIpOf(await headers(), env);
	} catch (error) {
		// Next marks a page dynamic by throwing from headers(): that one must reach Next
		if ((error as { digest?: string } | null)?.digest === 'DYNAMIC_SERVER_USAGE') throw error;
		return {};
	}
	return ip ? signClientIp(ip, secret, Math.floor(Date.now() / 1000)) : {};
}
