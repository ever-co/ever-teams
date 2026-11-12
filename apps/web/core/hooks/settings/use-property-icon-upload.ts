'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { imageAssetsService } from '@/core/services/client/api';
import { PROPERTY_ICON_FOLDER, uploadPercentOf } from '@/core/lib/utils/property-icon-upload';
import { uploadedIconValue } from '@/core/lib/utils/property-icon-value';
import { rememberUploadedIconPreview } from '@/core/lib/utils/uploaded-icon-preview';

interface PropertyIconUploadState {
	/**
	 * Uploads the image and answers the icon value naming it, or null when the upload was cancelled (the picker
	 * closed, or another image was chosen meanwhile). Throws when the upload fails.
	 */
	upload: (file: File) => Promise<string | null>;
	isUploading: boolean;
	/** How far the upload went, in percents; null while the browser does not know. */
	progress: number | null;
}

/**
 * Uploads an image as the icon of a task property through Gauzy's image assets, the upload the team and profile
 * avatars use. The icon is then saved like any other: Gauzy completes the value with where it stored the file. An
 * upload still running when the picker closes is cancelled, so the icon cannot change once the user moved on.
 */
export function usePropertyIconUpload(): PropertyIconUploadState {
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const controllerRef = useRef<AbortController | null>(null);

	useEffect(() => () => controllerRef.current?.abort(), []);

	const upload = useCallback(async (file: File) => {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setIsUploading(true);
		setProgress(null);
		try {
			const asset = await imageAssetsService.uploadImageAsset({
				file,
				folder: PROPERTY_ICON_FOLDER,
				signal: controller.signal,
				onUploadProgress: (event) => setProgress(uploadPercentOf(event))
			});
			if (controller.signal.aborted) {
				return null;
			}
			const value = uploadedIconValue(asset.id);
			rememberUploadedIconPreview(value, file);
			return value;
		} catch (error) {
			if (controller.signal.aborted) {
				return null;
			}
			throw error;
		} finally {
			if (controllerRef.current === controller) {
				controllerRef.current = null;
				setIsUploading(false);
				setProgress(null);
			}
		}
	}, []);

	return { upload, isUploading, progress };
}
