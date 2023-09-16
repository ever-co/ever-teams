import { serializeAsJSON } from '@excalidraw/excalidraw';
import { compressData } from './encode';
import { generateEncryptionKey } from './encryption';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';
import {
	EXCALIDRAW_APP_DOMAIN,
	EXCALIDRAW_BACKEND_POST_URL,
} from '@app/constants';

type ExportToBackendResult =
	| { url: null; errorMessage: string }
	| { url: string; errorMessage: null };

export const exportToBackend = async (
	elements: readonly ExcalidrawElement[],
	appState: Partial<AppState>,
	files: BinaryFiles
): Promise<ExportToBackendResult> => {
	if (!EXCALIDRAW_BACKEND_POST_URL || !EXCALIDRAW_APP_DOMAIN) {
		return { url: null, errorMessage: 'could Not Create Shareable Link' };
	}

	const encryptionKey = await generateEncryptionKey('string');

	const payload = await compressData(
		new TextEncoder().encode(
			serializeAsJSON(elements, appState, files, 'database')
		),
		{ encryptionKey }
	);

	try {
		// const filesMap = new Map<FileId, BinaryFileData>();
		// for (const element of elements) {
		// 	if (isInitializedImageElement(element) && files[element.fileId]) {
		// 		filesMap.set(element.fileId, files[element.fileId]);
		// 	}
		// }

		// const filesToUpload = await encodeFilesForUpload({
		// 	files: filesMap,
		// 	encryptionKey,
		// 	maxBytes: FILE_UPLOAD_MAX_BYTES,
		// });

		const response = await fetch(EXCALIDRAW_BACKEND_POST_URL, {
			method: 'POST',
			body: payload.buffer,
		});
		const json = await response.json();
		if (json.id) {
			const url = new URL(EXCALIDRAW_APP_DOMAIN);
			// We need to store the key (and less importantly the id) as hash instead
			// of queryParam in order to never send it to the server
			url.hash = `json=${json.id},${encryptionKey}`;
			const urlString = url.toString();

			// await saveFilesToFirebase({
			// 	prefix: `/files/shareLinks/${json.id}`,
			// 	files: filesToUpload,
			// });

			return { url: urlString, errorMessage: null };
		} else if (json.error_class === 'RequestTooLargeError') {
			return {
				url: null,
				errorMessage: 'could Not Create Shareable Link Too Big',
			};
		}

		return { url: null, errorMessage: 'couldNotCreateShareableLink' };
	} catch (error: any) {
		console.error(error);

		return { url: null, errorMessage: 'could Not Create Shareable Link' };
	}
};
