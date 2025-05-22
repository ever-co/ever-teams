import { serializeAsJSON } from '@excalidraw/excalidraw';
import { compressData } from './encode';
import { generateEncryptionKey } from './encryption';
import { BOARD_APP_DOMAIN, BOARD_BACKEND_POST_URL, FILE_UPLOAD_MAX_BYTES } from '@/core/constants/config/constants';
import { saveFilesToFirebase } from './firebase';
import { encodeFilesForUpload, isInitializedImageElement } from './files';
import {
	ExcalidrawElement,
	FileId,
	InitializedExcalidrawImageElement
} from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';
import { AppState, BinaryFileData, BinaryFiles } from '@excalidraw/excalidraw/dist/types/excalidraw/types';

type ExportToBackendResult = { url: null; errorMessage: string } | { url: string; errorMessage: null };

export const exportToBackend = async (
	elements: readonly ExcalidrawElement[],
	appState: Partial<AppState>,
	files: BinaryFiles
): Promise<ExportToBackendResult> => {
	if (!BOARD_BACKEND_POST_URL.value || !BOARD_APP_DOMAIN.value) {
		return { url: null, errorMessage: 'could Not Create Shareable Link' };
	}

	const encryptionKey = await generateEncryptionKey('string');

	const payload = await compressData(
		new TextEncoder().encode(serializeAsJSON(elements, appState, files, 'database')),
		{ encryptionKey }
	);

	try {
		const filesMap = new Map<FileId, BinaryFileData>();
		for (const element of elements) {
			if (isInitializedImageElement(element)) {
				const imageElement = element as InitializedExcalidrawImageElement;
				if (files[imageElement.fileId]) {
					filesMap.set(imageElement.fileId, files[imageElement.fileId]);
				}
			}
		}

		const filesToUpload = await encodeFilesForUpload({
			files: filesMap,
			encryptionKey,
			maxBytes: FILE_UPLOAD_MAX_BYTES
		});

		const response = await fetch(BOARD_BACKEND_POST_URL.value, {
			method: 'POST',
			body: payload.buffer
		});
		const json = await response.json();
		if (json.id) {
			const url = new URL(BOARD_APP_DOMAIN.value);
			// We need to store the key (and less importantly the id) as hash instead
			// of queryParam in order to never send it to the server
			url.hash = `json=${json.id},${encryptionKey}`;
			const urlString = url.toString();

			await saveFilesToFirebase({
				prefix: `/files/shareLinks/${json.id}`,
				files: filesToUpload
			});

			return { url: urlString, errorMessage: null };
		} else if (json.error_class === 'RequestTooLargeError') {
			return {
				url: null,
				errorMessage: 'Shareable Link Too Big'
			};
		}

		return { url: null, errorMessage: 'could Not Create Shareable Link' };
	} catch (error: any) {
		console.error(error);

		return { url: null, errorMessage: 'could Not Create Shareable Link' };
	}
};
