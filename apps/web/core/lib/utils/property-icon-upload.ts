/**
 * The images a user may upload as the icon of a task status, priority, size or issue type. Gauzy's image upload takes
 * raster images only (an SVG can carry script), and an icon is drawn at 16 px: the formats every browser shows, and
 * a size that keeps a list of icons light.
 */
export const PROPERTY_ICON_FOLDER = 'task_property_icons';

const PROPERTY_ICON_ACCEPTED_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const PROPERTY_ICON_ACCEPT_ATTRIBUTE = PROPERTY_ICON_ACCEPTED_TYPES.join(',');

export const PROPERTY_ICON_MAX_MEGABYTES = 1;

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const PROPERTY_ICON_MAX_BYTES = PROPERTY_ICON_MAX_MEGABYTES * BYTES_PER_MEGABYTE;

export type PropertyIconFileProblem = 'type' | 'size';

export function propertyIconFileProblemOf(file: Pick<File, 'type' | 'size'>): PropertyIconFileProblem | null {
	const isAcceptedType = PROPERTY_ICON_ACCEPTED_TYPES.includes(file.type);
	if (!isAcceptedType) {
		return 'type';
	}
	const isTooLarge = file.size > PROPERTY_ICON_MAX_BYTES;
	if (isTooLarge) {
		return 'size';
	}
	return null;
}

/** How far an upload went, in whole percents; null while the browser does not know the total. */
export function uploadPercentOf(progress: { loaded: number; total?: number | null }): number | null {
	const { loaded, total } = progress;
	if (!total || total <= 0) {
		return null;
	}
	const percent = Math.round((loaded / total) * 100);
	return Math.min(100, Math.max(0, percent));
}
