import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import {
	ExcalidrawAPIRefValue,
	AppState,
	BinaryFiles,
} from '@excalidraw/excalidraw/types/types';
import { useRef, useState, useEffect, useCallback } from 'react';
import { exportToBackend } from './export-to-backend';

export const useWhiteboard = () => {
	const loaded = useRef(false);
	// const { user } = useAuthenticateUser();
	const [excalidrawAPI, setExcalidrawAPI] =
		useState<ExcalidrawAPIRefValue | null>(null);

	useEffect(() => {
		if (!excalidrawAPI || !excalidrawAPI.ready || loaded.current) {
			return;
		}

		const elements = JSON.parse(
			window.localStorage.getItem('whiteboard-elements') || '[]'
		);

		const files = JSON.parse(
			window.localStorage.getItem('whiteboard-files') || '[]'
		);

		excalidrawAPI.readyPromise.then((api) => {
			api.addFiles(Object.values(files));
			api.updateScene({
				elements: elements,
			});
			api.scrollToContent();

			loaded.current = true;
		});
	}, [excalidrawAPI]);

	const saveChanges = useCallback(
		(
			elements: readonly ExcalidrawElement[],
			_: AppState,
			files: BinaryFiles
		) => {
			if (!loaded.current) return;

			window.localStorage.setItem(
				'whiteboard-elements',
				JSON.stringify(elements)
			);

			window.localStorage.setItem('whiteboard-files', JSON.stringify(files));
		},
		[]
	);

	const onLiveCollaboration = useCallback(async () => {
		if (excalidrawAPI?.ready) {
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
