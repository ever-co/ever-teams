import type { TEditorAiMode } from '@/core/types/schemas/ai/editor-assist.schema';

/** The operations offered in the writing-help panel, in their display order ("custom" has its own field). */
export const AI_PANEL_MODES: readonly Exclude<TEditorAiMode, 'custom'>[] = [
	'improve',
	'fix',
	'shorter',
	'longer',
	'simplify',
	'summarize',
	'continue',
	'tone_friendly',
	'tone_professional',
	'tone_direct'
];

/** Gauzy accepts raster images only on its upload route (an SVG can carry a script). */
export const EDITOR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const EDITOR_IMAGE_ACCEPT = EDITOR_IMAGE_TYPES.join(',');

export const EDITOR_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const EDITOR_IMAGE_FOLDER = 'description_images';

export type TEditorImageProblem = 'type' | 'size';

export function editorImageProblemOf(file: File): TEditorImageProblem | null {
	const isAcceptedType = EDITOR_IMAGE_TYPES.includes(file.type);
	if (!isAcceptedType) {
		return 'type';
	}
	const isTooLarge = file.size > EDITOR_IMAGE_MAX_BYTES;
	if (isTooLarge) {
		return 'size';
	}
	return null;
}

export function imageFilesOf(list: FileList | null | undefined): File[] {
	const files = Array.from(list ?? []);
	return files.filter((file) => file.type.startsWith('image/'));
}

/** A picture's alt text from its file name: "login_error-2.png" becomes "login error 2". */
export function altTextOf(file: File) {
	const withoutExtension = file.name.replace(/\.[a-z0-9]+$/i, '');
	const spaced = withoutExtension.replace(/[_-]+/g, ' ');
	const trimmed = spaced.trim().slice(0, 120);
	return trimmed || 'image';
}
