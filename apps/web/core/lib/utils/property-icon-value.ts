/**
 * What the `icon` of a task status, priority, size or issue type holds. The column stays a plain string (Gauzy's
 * contract), and three kinds of values live in it:
 * - `hugeicons:<key>`: an icon of the app's library (`core/components/icons/property-icon-catalog.tsx`). Gauzy keeps
 *   the text as it is and returns no `fullIconUrl` for it.
 * - `ever-icons/<group>/<name>.svg`: one of the classic icons Gauzy serves, which every seeded property has. The app
 *   draws its own glyph for these (`TaskPropertyIcon`), so they keep the design system's look.
 * - any other path, or an absolute URL: an icon file of the user's own, loaded from Gauzy.
 */
export const LIBRARY_ICON_PREFIX = 'hugeicons:';

const CLASSIC_ICON_DIRECTORY = 'ever-icons/';
const ABSOLUTE_URL = /^https?:\/\//i;

function trimmed(value: string | null | undefined): string {
	return (value ?? '').trim();
}

/** The stored value of a library icon. */
export function libraryIconValue(key: string): string {
	return `${LIBRARY_ICON_PREFIX}${key}`;
}

/** The library key a stored value names, or null when it is not a library icon. */
export function libraryIconKeyOf(value: string | null | undefined): string | null {
	const text = trimmed(value);
	if (!text.startsWith(LIBRARY_ICON_PREFIX)) {
		return null;
	}
	const key = text.slice(LIBRARY_ICON_PREFIX.length);
	return key || null;
}

/** Whether the value is one of the classic icons Gauzy serves under `public/ever-icons`. */
export function isClassicIcon(value: string | null | undefined): boolean {
	const text = trimmed(value);
	let start = 0;
	while (start < text.length && text[start] === '/') start += 1;
	return text.slice(start).startsWith(CLASSIC_ICON_DIRECTORY);
}

const CLASSIC_ICON_KINDS = {
	'task-statuses': 'status',
	'task-sizes': 'size',
	'task-priorities': 'priority'
} as const;

/**
 * The glyph a classic icon is drawn as: the app draws its own glyph for these instead of loading Gauzy's file, so the
 * picker shows a classic icon the way the property will look. Null for any other value.
 */
export function classicIconGlyphOf(
	value: string | null | undefined
): { kind: (typeof CLASSIC_ICON_KINDS)[keyof typeof CLASSIC_ICON_KINDS]; name: string } | null {
	if (!isClassicIcon(value)) {
		return null;
	}
	const [, group, fileName = ''] = trimmed(value).replace(/^\/+/, '').split('/');
	const kind = CLASSIC_ICON_KINDS[group as keyof typeof CLASSIC_ICON_KINDS];
	const name = fileName.replace(/\.svg$/i, '');
	if (!kind || !name) {
		return null;
	}
	return { kind, name };
}

/** Whether the value is an absolute URL to an icon file. */
export function isIconUrl(value: string | null | undefined): boolean {
	return ABSOLUTE_URL.test(trimmed(value));
}

/**
 * An icon the user chose that the app shows in place of its drawn glyph: a library icon, or an icon file of their own.
 * A classic icon and an empty value are not.
 */
export function isCustomIcon(value: string | null | undefined): boolean {
	const text = trimmed(value);
	return Boolean(text) && !isClassicIcon(text);
}
