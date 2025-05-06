import * as Crypto from 'expo-crypto';

/**
 * Generates a cryptographically secure random token
 *
 * @param length The length of the token to generate
 * @returns A secure random token string
 */
export async function generateSecureToken(length: number): Promise<string> {
	try {
		// Generate cryptographically secure random bytes
		const randomBytes = await Crypto.getRandomBytesAsync(length);

		// Convert to hexadecimal string
		return Array.from(randomBytes)
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('')
			.substring(0, length); // Ensure we have exactly the requested length
	} catch (error) {
		console.error('Error generating secure token:', error);
		// Fallback to a less secure method if crypto fails
		return generateFallbackToken(length);
	}
}

/**
 * A fallback token generator that doesn't use Math.random
 * Only used if the secure generator fails
 *
 * @param length The length of the token to generate
 * @returns A token string
 */
function generateFallbackToken(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';

	for (let i = 0; i < length; i++) {
		// Using window.crypto for better randomness in fallback
		const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % chars.length;
		result += chars.charAt(randomIndex);
	}

	return result;
}

/**
 * Legacy synchronous token generator for backward compatibility
 * @deprecated Use generateSecureToken instead
 */
export function generateToken(length: number): string {
	console.warn('Warning: Using deprecated generateToken. Switch to generateSecureToken for better security.');
	// This exists just for backward compatibility
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	// Use a rejection sampling approach to avoid modulo bias
	const max = Math.floor(0xffffffff / chars.length) * chars.length;
	let rand;

	do {
		rand = crypto.getRandomValues(new Uint32Array(1))[0];
	} while (rand >= max);
	result += chars.charAt(rand % chars.length);

	return result;
}

export default generateSecureToken;
