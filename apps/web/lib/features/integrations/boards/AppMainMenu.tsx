import React from 'react';
import { MainMenu } from '@excalidraw/excalidraw';

export const AppMainMenu = React.memo(() => {
	return (
		<MainMenu>
			<MainMenu.DefaultItems.LoadScene />
			<MainMenu.DefaultItems.SaveToActiveFile />
			<MainMenu.DefaultItems.Export />
			<MainMenu.DefaultItems.SaveAsImage />

			<MainMenu.DefaultItems.Help />
			<MainMenu.DefaultItems.ClearCanvas />

			<MainMenu.DefaultItems.ToggleTheme />
			<MainMenu.DefaultItems.ChangeCanvasBackground />
		</MainMenu>
	);
});

AppMainMenu.displayName = 'AppMainMenu';
