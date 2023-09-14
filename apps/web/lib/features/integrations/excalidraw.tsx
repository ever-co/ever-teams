import { Excalidraw, THEME } from '@excalidraw/excalidraw';

import { useTheme } from 'next-themes';
import { EverTeamsLogo } from 'lib/components/svgs';
import debounce from 'lodash/debounce';
import { useWhiteboard } from './hooks';

export default function ExcalidrawComponent() {
	const { theme } = useTheme();
	const { saveChanges, setExcalidrawAPI, excalidrawAPI } = useWhiteboard();

	return (
		<>
			<div style={{ height: '100vh' }}>
				<Excalidraw
					ref={(api) => setExcalidrawAPI(api)}
					onChange={debounce(saveChanges, 500)}
					theme={theme || THEME.LIGHT}
					renderTopRightUI={() => <></>}
				/>
			</div>

			{excalidrawAPI?.ready && (
				<div className="absolute z-50 top-5 left-14 scale-75">
					<EverTeamsLogo color={THEME ? 'auto' : 'dark'} dash />
				</div>
			)}
		</>
	);
}
