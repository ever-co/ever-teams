import { CHAT_IMAGE_MAX_EDGE, isShrinkableImage, shrunkSize } from './chat-attachments';

/** The quality a shrunk photo is encoded at: no visible loss at chat sizes, a fraction of the bytes. */
const PHOTO_QUALITY = 0.86;

/**
 * A picked image shrunk in the browser before its upload: a photo larger than {@link CHAT_IMAGE_MAX_EDGE} on its longer
 * side is redrawn at that size (the browser applies its orientation), in its own format. Anything else, an image that
 * already fits, a browser that cannot decode it, or a result no smaller than the original, goes up as it was picked.
 */
export async function shrinkImage(file: File, maxEdge = CHAT_IMAGE_MAX_EDGE): Promise<File> {
	if (!isShrinkableImage(file.type) || typeof createImageBitmap !== 'function' || typeof document === 'undefined')
		return file;
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}
	try {
		const size = shrunkSize(bitmap.width, bitmap.height, maxEdge);
		if (!size) return file;
		const canvas = document.createElement('canvas');
		canvas.width = size.width;
		canvas.height = size.height;
		const context = canvas.getContext('2d');
		if (!context) return file;
		context.imageSmoothingQuality = 'high';
		context.drawImage(bitmap, 0, 0, size.width, size.height);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, PHOTO_QUALITY));
		if (!blob || blob.size >= file.size) return file;
		return new File([blob], file.name, { type: blob.type || file.type, lastModified: file.lastModified });
	} catch {
		return file;
	} finally {
		bitmap.close();
	}
}
