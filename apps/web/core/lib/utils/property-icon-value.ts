/**
 * What the `icon` of a task status, priority, size or issue type holds. The column stays a plain string (Gauzy's
 * contract), and four kinds of values live in it:
 * - `hugeicons:<key>`: an icon of the app's library (`core/components/icons/property-icon-catalog.tsx`). Gauzy keeps
 *   the text as it is and returns no `fullIconUrl` for it.
 * - `image-asset:<image asset id>`: an image the user uploaded (Gauzy's image assets). Gauzy stores it completed with
 *   the provider and the key of its file, `image-asset:<id>:<provider>:<key>`, and returns its URL as `fullIconUrl`.
 * - `ever-icons/<group>/<name>.svg`: one of the classic icons Gauzy serves, which every seeded property has. The app
 *   draws its own glyph for these (`TaskPropertyIcon`), so they keep the design system's look.
 * - any other path, or an absolute URL: an icon file of the user's own, loaded from Gauzy.
 */
export const LIBRARY_ICON_PREFIX = 'hugeicons:';

const UPLOADED_ICON_PREFIX = 'image-asset:';

/** Gauzy's own disk: an uploaded image it keeps there is served from its `public/` folder. */
const GAUZY_DISK_PROVIDER = 'LOCAL';

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

/** The value that names an image the user uploaded; Gauzy completes it when the property is saved. */
export function uploadedIconValue(assetId: string): string {
	return `${UPLOADED_ICON_PREFIX}${assetId}`;
}

interface UploadedIcon {
	assetId: string;
	/** The provider that holds the file, once Gauzy stored the icon. */
	storageProvider: string | null;
	/** The key of the file in that provider, once Gauzy stored the icon. */
	key: string | null;
}

/** The uploaded image a value names, as the app sends it or as Gauzy stores it; null for any other value. */
export function uploadedIconOf(value: string | null | undefined): UploadedIcon | null {
	const text = trimmed(value);
	if (!text.startsWith(UPLOADED_ICON_PREFIX)) {
		return null;
	}
	const [assetId = '', storageProvider, ...keyParts] = text.slice(UPLOADED_ICON_PREFIX.length).split(':');
	if (!assetId) {
		return null;
	}
	// A key may hold a colon of its own
	const key = keyParts.join(':');
	return { assetId, storageProvider: storageProvider || null, key: key || null };
}

export function isUploadedIcon(value: string | null | undefined): boolean {
	return uploadedIconOf(value) !== null;
}

/**
 * The file key of an uploaded image Gauzy keeps on its own disk, which the app loads like the other files Gauzy
 * serves. Null for an image held elsewhere (S3, Wasabi, DigitalOcean, Cloudinary): Gauzy's `fullIconUrl` is its URL.
 */
export function gauzyDiskIconKeyOf(value: string | null | undefined): string | null {
	const icon = uploadedIconOf(value);
	if (icon?.storageProvider !== GAUZY_DISK_PROVIDER) {
		return null;
	}
	return icon.key;
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
