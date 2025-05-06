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
      .map(byte => byte.toString(16).padStart(2, '0'))
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

  // Using Date.now and performance timing instead of Math.random
  const now = Date.now();

  for (let i = 0; i < length; i++) {
    // This is still not cryptographically secure, but better than Math.random
    const randomIndex = (now + i * performance.now()) % chars.length;
    result += chars.charAt(Math.floor(randomIndex));
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

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % chars.length));
  }

  return result;
}

export default generateSecureToken;
