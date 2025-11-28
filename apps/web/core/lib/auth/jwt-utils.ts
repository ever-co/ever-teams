/**
 * JWT Utilities for Token Validation and Refresh Interval Calculation
 *
 * Uses jwt-decode library for robust JWT parsing.
 *
 * Based on Ever-Gauzy token configuration:
 * - Access Token: 1 day (86400s) - JWT_TOKEN_EXPIRATION_TIME
 * - Refresh Token: 7 days (604800s) - JWT_REFRESH_TOKEN_EXPIRATION_TIME
 *
 * KEY PRINCIPLE:
 * - ALWAYS validate token expiration BEFORE making refresh API calls
 * - Only refresh if token is expired or expiring soon (within buffer)
 * - This avoids unnecessary API calls and reduces server load
 *
 */

import jwtDecode from 'jwt-decode';

export interface JWTPayload {
	id: string;
	email?: string;
	tenantId: string | null;
	employeeId?: string | null;
	role: string | null;
	permissions?: Array<{ permission: string; enabled: boolean }> | null;
	iat: number; // Issued At (timestamp in seconds)
	exp: number; // Expiration (timestamp in seconds)
}

/**
 * Decode a JWT token payload without verifying the signature
 * Uses jwt-decode library for robust parsing
 *
 * WARNING: This is only for reading token metadata, NOT for security validation
 *
 * @param token - The JWT token string
 * @returns The decoded payload or null if invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
	try {
		if (!token || typeof token !== 'string') {
			return null;
		}

		const payload = jwtDecode<JWTPayload>(token);

		// Validate required fields
		if (!payload.exp || !payload.iat) {
			console.warn('[JWT] Token missing exp or iat fields');
			return null;
		}

		return payload;
	} catch (error) {
		console.error('[JWT] Failed to decode token:', error);
		return null;
	}
}

/**
 * Check if a token NEEDS to be refreshed
 *
 * KEY LOGIC:
 * - Return TRUE only if token is expired or expiring within buffer
 * - Return FALSE if token is still valid (no need to refresh)
 *
 * This prevents unnecessary refresh API calls when token is still valid.
 *
 * @param token - The JWT token string
 * @param bufferSeconds - Buffer before actual expiration (default: 300s = 5 min)
 * @returns true if refresh is needed, false if token is still valid
 */
export function shouldRefreshToken(token: string, bufferSeconds = 300): boolean {
	const payload = decodeJWT(token);
	if (!payload) return true; // Invalid token → needs refresh (or logout)

	const now = Math.floor(Date.now() / 1000);
	const expiresIn = payload.exp - now;

	// Only refresh if token expires within buffer
	return expiresIn <= bufferSeconds;
}

/**
 * Get the token lifetime in seconds from a JWT
 *
 * @param token - The JWT token string
 * @returns Token lifetime in seconds, or null if invalid
 */
export function getTokenLifetime(token: string): number | null {
	const payload = decodeJWT(token);
	if (!payload) return null;

	return payload.exp - payload.iat;
}

/**
 * Check if a token is expired
 *
 * @param token - The JWT token string
 * @param bufferSeconds - Optional buffer before actual expiration (default: 60s)
 * @returns true if expired (or will expire within buffer), false otherwise
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
	const payload = decodeJWT(token);
	if (!payload) return true; // Treat invalid tokens as expired

	const now = Math.floor(Date.now() / 1000);
	return payload.exp <= now + bufferSeconds;
}

/**
 * Get remaining time until token expiration
 *
 * @param token - The JWT token string
 * @returns Remaining time in seconds, or 0 if expired/invalid
 */
export function getTokenRemainingTime(token: string): number {
	const payload = decodeJWT(token);
	if (!payload) return 0;

	const now = Math.floor(Date.now() / 1000);
	const remaining = payload.exp - now;
	return remaining > 0 ? remaining : 0;
}

/**
 * Calculate the optimal refresh interval based on token lifetime
 *
 * Strategy: Refresh at 50% of token lifetime (per OAuth 2.0 best practices)
 * - For 24h token → refresh every 12h (2 calls/day)
 * - For 1h token → refresh every 30min
 *
 * Constraints:
 * - Minimum: 10 minutes (avoid excessive API calls)
 * - Maximum: 12 hours (ensure refresh before expiration)
 *
 * @param token - The JWT token string
 * @returns Refresh interval in milliseconds
 */
export function calculateRefreshInterval(token: string): number {
	const lifetime = getTokenLifetime(token);

	// Default to 12 hours if we can't determine lifetime
	const DEFAULT_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in ms
	const MIN_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms
	const MAX_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in ms

	if (!lifetime) {
		console.warn('[JWT] Could not determine token lifetime, using default interval');
		return DEFAULT_INTERVAL;
	}

	// Refresh at 50% of token lifetime
	const optimalInterval = (lifetime * 1000) / 2;

	// Apply constraints
	const interval = Math.max(MIN_INTERVAL, Math.min(optimalInterval, MAX_INTERVAL));

	console.log(`[JWT] Token lifetime: ${lifetime}s, Refresh interval: ${interval / 1000 / 60}min`);

	return interval;
}

/**
 * Format remaining time for display
 *
 * @param seconds - Remaining time in seconds
 * @returns Human-readable string (e.g., "23h 45m" or "5m 30s")
 */
export function formatRemainingTime(seconds: number): string {
	if (seconds <= 0) return 'expired';

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	} else {
		return `${secs}s`;
	}
}
