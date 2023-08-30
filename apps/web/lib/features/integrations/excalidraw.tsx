import React, { useEffect, useRef, useState } from 'react';
import {
	Excalidraw,
	LiveCollaborationTrigger,
	THEME,
} from '@excalidraw/excalidraw';
import { ExcalidrawAPIRefValue } from '@excalidraw/excalidraw/types/types';
import { useAuthenticateUser } from '@app/hooks';
import { useTheme } from 'next-themes';
import { EverTeamsLogo } from 'lib/components/svgs';

export default function ExcalidrawComponent() {
	const { theme } = useTheme();
	const { user } = useAuthenticateUser();
	const [excalidrawAPI, setExcalidrawAPI] =
		useState<ExcalidrawAPIRefValue | null>(null);

	const collaborators = useRef(new Map());

	useEffect(() => {
		if (!excalidrawAPI || !excalidrawAPI.ready || !user) {
			return;
		}

		collaborators.current.set(user.id, {
			username: user.name,
			avatarUrl: user.imageUrl,
		});

		excalidrawAPI.updateScene({ collaborators: collaborators.current });
	}, [user, excalidrawAPI]);

	return (
		<>
			<div style={{ height: '100vh' }}>
				<Excalidraw
					ref={(api) => setExcalidrawAPI(api)}
					theme={theme || THEME.LIGHT}
					renderTopRightUI={() => (
						<LiveCollaborationTrigger
							isCollaborating={true}
							onSelect={() => {
								console.log('You clicked on collab button');
							}}
						/>
					)}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo />
				</div>
			)}
		</>
	);
}
