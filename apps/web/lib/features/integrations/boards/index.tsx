import { Excalidraw, THEME } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import { useTheme } from 'next-themes';
import { EverTeamsLogo } from '@/core/components/svgs';
import debounce from 'lodash/debounce';
import { useBoard } from './hooks';
import { useEffect, useState } from 'react';
import { SpinnerLoader } from '@/core/components';
import { LOCAL_STORAGE_THEME } from './constants';
import { clsxm } from '@app/utils';
import { AppMainMenu } from './AppMainMenu';
import { LiveShareIcon } from 'assets/svg';

export default function ExcalidrawComponent() {
	const { theme, resolvedTheme } = useTheme();
	const [liveLoading, setLiveLoading] = useState(false);
	const { saveChanges, setExcalidrawAPI, onLiveCollaboration } = useBoard();

	const $theme = !theme || theme === 'system' ? resolvedTheme : theme;

	const onClickLiveCollaboration = () => {
		setLiveLoading(true);
		onLiveCollaboration().finally(() => setLiveLoading(false));
	};

	useEffect(() => {
		if ($theme) {
			localStorage.setItem(LOCAL_STORAGE_THEME, $theme);
		}
	}, [$theme]);

	return (
		<>
			<div style={{ height: '100vh' }}>
				<Excalidraw
					// @ts-ignore
					excalidrawRef={(api: ExcalidrawImperativeAPI | null) =>
						setExcalidrawAPI(api as ExcalidrawImperativeAPI | null)
					}
					onChange={debounce(saveChanges, 500)}
					theme={$theme === 'dark' ? THEME.DARK : THEME.LIGHT}
					renderTopRightUI={() => (
						<button onClick={onClickLiveCollaboration}>
							{liveLoading ? (
								<SpinnerLoader variant={$theme ? undefined : 'dark'} className="mt-2" size={20} />
							) : (
								<LiveShareIcon className={clsxm($theme ? undefined : 'fill-black', 'w-5 h-5')} />
							)}
						</button>
					)}
				>
					<AppMainMenu />
				</Excalidraw>
			</div>
			<div className="absolute z-50 top-5 left-14 scale-75">
				<EverTeamsLogo color={$theme ? 'auto' : 'dark'} dash />
			</div>
		</>
	);
}
