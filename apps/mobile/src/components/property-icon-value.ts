/**
 * What the stored `icon` of a task status, priority, size or label holds, read as the web reads it
 * (apps/web/core/lib/utils/property-icon-value.ts): `ever-icons/...` is one of the classic icons Gauzy seeds, which the
 * app replaces with its own glyph; anything else is an icon of the user's own.
 */
const CLASSIC_ICON_DIRECTORY = 'ever-icons/';

function trimmed(value: string | null | undefined): string {
	return (value ?? '').trim();
}

/** A classic icon Gauzy serves, with or without leading slashes. */
export function isClassicIcon(value: string | null | undefined): boolean {
	const text = trimmed(value);
	let start = 0;
	while (start < text.length && text[start] === '/') start += 1;
	return text.slice(start).startsWith(CLASSIC_ICON_DIRECTORY);
}

/** An icon of the user's own: set, and not a classic one. */
export function isCustomIcon(value: string | null | undefined): boolean {
	const text = trimmed(value);
	return Boolean(text) && !isClassicIcon(text);
}
