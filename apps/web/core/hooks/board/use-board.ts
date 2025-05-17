import { exportToBackend } from '@/core/lib/helpers/export-to-backend';
import { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import { useRef, useState, useEffect, useCallback } from 'react';

export const useBoard = () => {
	const loaded = useRef(false);
	// const { user } = useAuthenticateUser();
	const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

	useEffect(() => {
		if (!excalidrawAPI || loaded.current) {
			return;
		}

		const elements = JSON.parse(window.localStorage.getItem('board-elements') || '[]');

		const files = JSON.parse(window.localStorage.getItem('board-files') || '[]');

		Promise.resolve().then(() => {
			excalidrawAPI.addFiles(Object.values(files));
			excalidrawAPI.updateScene({
				elements: elements
			});
			excalidrawAPI.scrollToContent();

			loaded.current = true;
		});
	}, [excalidrawAPI]);

	const saveChanges = useCallback((elements: readonly ExcalidrawElement[], _: AppState, files: BinaryFiles) => {
		if (!loaded.current) return;

		window.localStorage.setItem('board-elements', JSON.stringify(elements));

		window.localStorage.setItem('board-files', JSON.stringify(files));
	}, []);

	const onLiveCollaboration = useCallback(async () => {
		if (excalidrawAPI) {
			await exportToBackend(
				excalidrawAPI.getSceneElements(),
				excalidrawAPI.getAppState(),
				excalidrawAPI.getFiles()
			).then((res) => {
				if (res.url) {
					const uri = new URL(res.url);
					uri.searchParams.set('live', 'true');
					window.open(uri.toString(), '_blank', 'noreferrer');
				}
			});
		}
	}, [excalidrawAPI]);

	return { setExcalidrawAPI, excalidrawAPI, saveChanges, onLiveCollaboration };
};
