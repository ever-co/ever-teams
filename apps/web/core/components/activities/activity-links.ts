const WEB_PROTOCOLS = new Set(['http:', 'https:']);

const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

/** An address from recorded data is linked only when it is a plain web address, never `javascript:` or `data:`. */
export function webAddressOf(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return null;
	}
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return null;
	}
	const isWebAddress = WEB_PROTOCOLS.has(parsed.protocol);
	if (!isWebAddress) {
		return null;
	}
	return parsed.href;
}

/** A visited site is often recorded as a bare host (`github.com`): it is read as an https address. */
export function siteAddressOf(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	const trimmed = value.trim();
	const hasScheme = SCHEME_PATTERN.test(trimmed);
	if (hasScheme) {
		return webAddressOf(trimmed);
	}
	const hasSpace = /\s/.test(trimmed);
	if (hasSpace) {
		return null;
	}
	return webAddressOf(`https://${trimmed}`);
}
