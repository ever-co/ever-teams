/** A version 4 UUID from the browser's cryptographic source. */
export function newUuid(): string {
	const cryptoApi = globalThis.crypto;
	if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
	// `randomUUID` needs a secure context (https or localhost); `getRandomValues` does not.
	const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
