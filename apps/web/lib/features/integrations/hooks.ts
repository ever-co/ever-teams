import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import {
	ExcalidrawAPIRefValue,
	AppState,
	BinaryFiles,
} from '@excalidraw/excalidraw/types/types';
import { useRef, useState, useEffect, useCallback } from 'react';

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

		const appstate = JSON.parse(
			window.localStorage.getItem('whiteboard-appstate') || '{}'
		) as AppState;

		const files = JSON.parse(
			window.localStorage.getItem('whiteboard-files') || '[]'
		);

		excalidrawAPI.readyPromise.then((api) => {
			api.addFiles(Object.values(files));
			api.updateScene({
				elements: elements,
				appState: {
					scrollX: appstate.scrollX || 0,
					scrollY: appstate.scrollY || 0,
				},
			});

			loaded.current = true;
		});
	}, [excalidrawAPI]);

	const saveChanges = useCallback(
		(
			elements: readonly ExcalidrawElement[],
			appState: AppState,
			files: BinaryFiles
		) => {
			if (!loaded.current) return;

			window.localStorage.setItem(
				'whiteboard-appstate',
				JSON.stringify(appState)
			);

			window.localStorage.setItem(
				'whiteboard-elements',
				JSON.stringify(elements)
			);

			window.localStorage.setItem('whiteboard-files', JSON.stringify(files));
		},
		[]
	);

	return { setExcalidrawAPI, excalidrawAPI, saveChanges };
};
