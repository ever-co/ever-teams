/**
 * Local previews of the images uploaded as property icons in this tab, by the value that names them
 * (`image-asset:<id>`). Until the property is saved, Gauzy has no URL for such a value: the icon picker, the editor's
 * preview and a list that shows the change before its refetch draw the file the user picked instead, with no request,
 * wherever the file is stored.
 */
const previews = new Map<string, string>();

/** A few uploads per session at most; the oldest previews let their files go. */
const MAX_PREVIEWS = 20;

function canPreview(): boolean {
	return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
}

function release(url: string): void {
	if (typeof URL.revokeObjectURL === 'function') {
		URL.revokeObjectURL(url);
	}
}

export function rememberUploadedIconPreview(value: string, file: Blob): void {
	if (!canPreview()) {
		return;
	}
	const key = value.trim();
	const previous = previews.get(key);
	if (previous) {
		release(previous);
	}
	// Re-inserted last, so the map stays ordered from the oldest preview to the newest
	previews.delete(key);
	previews.set(key, URL.createObjectURL(file));
	for (const [oldest, url] of previews) {
		if (previews.size <= MAX_PREVIEWS) {
			break;
		}
		previews.delete(oldest);
		release(url);
	}
}

export function uploadedIconPreviewOf(value: string | null | undefined): string | null {
	return previews.get((value ?? '').trim()) ?? null;
}
