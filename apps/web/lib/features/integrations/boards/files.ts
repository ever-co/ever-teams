import {
	ExcalidrawElement,
	FileId,
	InitializedExcalidrawImageElement
} from '@excalidraw/excalidraw/types/element/types';
import {
	BinaryFileData,
	BinaryFileMetadata
} from '@excalidraw/excalidraw/types/types';
import { compressData } from './encode';

export const isInitializedImageElement = (
	element: ExcalidrawElement | null
): element is InitializedExcalidrawImageElement => {
	return !!element && element.type === 'image' && !!element.fileId;
};

export const encodeFilesForUpload = async ({
	files,
	maxBytes,
	encryptionKey
}: {
	files: Map<FileId, BinaryFileData>;
	maxBytes: number;
	encryptionKey: string;
}) => {
	const processedFiles: {
		id: FileId;
		buffer: Uint8Array;
	}[] = [];

	for (const [id, fileData] of files) {
		const buffer = new TextEncoder().encode(fileData.dataURL);

		const encodedFile = await compressData<BinaryFileMetadata>(buffer, {
			encryptionKey,
			metadata: {
				id,
				mimeType: fileData.mimeType,
				created: Date.now(),
				lastRetrieved: Date.now()
			}
		});

		if (buffer.byteLength > maxBytes) {
			throw new Error(
				`file Too Big, maxSize: ${Math.trunc(maxBytes / 1024 / 1024)}MB`
			);
		}

		processedFiles.push({
			id,
			buffer: encodedFile
		});
	}

	return processedFiles;
};
