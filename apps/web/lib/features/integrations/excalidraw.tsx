import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Excalidraw,
	LiveCollaborationTrigger,
	THEME,
} from '@excalidraw/excalidraw';
import { ExcalidrawAPIRefValue } from '@excalidraw/excalidraw/types/types';
// import { useAuthenticateUser } from '@app/hooks';
import { useTheme } from 'next-themes';
import { EverTeamsLogo } from 'lib/components/svgs';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import debounce from 'lodash/debounce';

export default function ExcalidrawComponent() {
	const { theme } = useTheme();
	const loaded = useRef(false);
	// const { user } = useAuthenticateUser();
	const [excalidrawAPI, setExcalidrawAPI] =
		useState<ExcalidrawAPIRefValue | null>(null);

	useEffect(() => {
		if (!excalidrawAPI || !excalidrawAPI.ready) {
			return;
		}

		if (!loaded.current) {
			const elements = JSON.parse(
				window.localStorage.getItem('whiteboard-elements') || '[]'
			);

			console.log(elements);

			// excalidrawAPI.sc({ elements });

			loaded.current = true;
		}
	}, [excalidrawAPI]);

	const saveChanges = useCallback((elements: readonly ExcalidrawElement[]) => {
		if (!loaded.current) return;

		// window.localStorage.setItem(
		// 	'whiteboard-elements',
		// 	JSON.stringify(elements)
		// );
	}, []);

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
							onSelect={() => {
								console.log('You clicked on collab button');
							}}
						/>
					)}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo dash />
				</div>
			)}
		</>
	);
}
