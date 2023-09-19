import { Excalidraw, THEME } from '@excalidraw/excalidraw';
import { useTheme } from 'next-themes';
import { EverTeamsLogo, LiveShareIcon } from 'lib/components/svgs';
import debounce from 'lodash/debounce';
import { useWhiteboard } from './hooks';
import { useState } from 'react';
import { SpinnerLoader } from 'lib/components';

export default function ExcalidrawComponent() {
	const { theme } = useTheme();
	const [liveLoading, setLiveLoading] = useState(false);
	const { saveChanges, setExcalidrawAPI, excalidrawAPI, onLiveCollaboration } =
		useWhiteboard();

	const onClickLiveCollaboration = () => {
		setLiveLoading(true);
		onLiveCollaboration().finally(() => setLiveLoading(false));
	};

	return (
		<>
			<div style={{ height: '100vh' }}>
				<Excalidraw
					ref={(api) => setExcalidrawAPI(api)}
					onChange={debounce(saveChanges, 500)}
					theme={theme || THEME.LIGHT}
					renderTopRightUI={() => (
						<button onClick={onClickLiveCollaboration}>
							{liveLoading ? (
								<SpinnerLoader
									variant={theme ? undefined : 'dark'}
									className="mt-2"
									size={20}
								/>
							) : (
								<LiveShareIcon className={theme ? undefined : 'fill-black'} />
							)}
						</button>
					)}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo color={theme ? 'auto' : 'dark'} dash />
				</div>
			)}
		</>
	);
}
