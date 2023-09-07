import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Excalidraw,
	LiveCollaborationTrigger,
	THEME,
} from '@excalidraw/excalidraw';

import {
	AppState,
	BinaryFiles,
	ExcalidrawAPIRefValue,
} from '@excalidraw/excalidraw/types/types';
// import { useAuthenticateUser } from '@app/hooks';
import { useTheme } from 'next-themes';
import { EverTeamsLogo } from 'lib/components/svgs';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import debounce from 'lodash/debounce';
import { Card, Modal } from 'lib/components';
import { IHookModal, useModal } from '@app/hooks';

export default function ExcalidrawComponent() {
	const modal = useModal();
	const { theme } = useTheme();
	const { saveChanges, setExcalidrawAPI, excalidrawAPI } = useWhiteboard();

	return (
		<>
			<div style={{ height: '100vh' }}>
				<Excalidraw
					ref={(api) => setExcalidrawAPI(api)}
					onChange={debounce(saveChanges, 500)}
					theme={theme || THEME.LIGHT}
					renderTopRightUI={() => (
						<LiveCollaborationTrigger
							isCollaborating={false}
							type="button"
							onSelect={modal.openModal}
						/>
					)}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo dash />
				</div>
			)}

			<SaveListModal modal={modal} />
		</>
	);
}

function SaveListModal({ modal }: { modal: IHookModal }) {
	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal} alignCloseIcon>
			<Card className="w-full min-w-[600px]" shadow="custom"></Card>
		</Modal>
	);
}

const useWhiteboard = () => {
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
