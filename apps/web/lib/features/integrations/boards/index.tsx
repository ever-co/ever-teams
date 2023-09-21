import { Excalidraw, THEME } from '@excalidraw/excalidraw';
import { useTheme } from 'next-themes';
import { EverTeamsLogo, LiveShareIcon } from 'lib/components/svgs';
import debounce from 'lodash/debounce';
import { useBoard } from './hooks';
import { useEffect, useState } from 'react';
import { SpinnerLoader } from 'lib/components';
import { LOCAL_STORAGE_THEME } from './constants';
import { clsxm } from '@app/utils';

export default function ExcalidrawComponent() {
	const { theme, resolvedTheme } = useTheme();
	const [liveLoading, setLiveLoading] = useState(false);
	const { saveChanges, setExcalidrawAPI, excalidrawAPI, onLiveCollaboration } =
		useBoard();

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
					ref={(api) => setExcalidrawAPI(api)}
					onChange={debounce(saveChanges, 500)}
					theme={$theme || THEME.LIGHT}
					renderTopRightUI={() => (
						<button onClick={onClickLiveCollaboration}>
							{liveLoading ? (
								<SpinnerLoader
									variant={$theme ? undefined : 'dark'}
									className="mt-2"
									size={20}
								/>
							) : (
								<LiveShareIcon
									className={clsxm(
										$theme ? undefined : 'fill-black',
										'w-5 h-5'
									)}
								/>
							)}
						</button>
					)}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo color={$theme ? 'auto' : 'dark'} dash />
				</div>
			)}
		</>
	);
}
