import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useThemeUI } from 'theme-ui';
import { teamsBasicConfig } from './config';
import { teamsBasicModel } from './model';
import { teamsBasicView } from './view';
export { TeamsBasicWrapper } from './component';

export const useTeamsBasic = ({ editor }: { editor: any }) => {
	const { theme } = useThemeUI();

	const globalStyles = `
    .basic-ever-container {
      --background: 0 0% 100%;
      --foreground: 222.2 47.4% 11.2%;
      --primary: 210 40% 98%;
      --primary-foreground: 222.2 47.4% 1.2%;
      --secondary: 222.2 47.4% 11.2%;
      --secondary-foreground: 210 40% 98%;
      --destructive: 0 63% 31%;
      --destructive-foreground: 210 40% 98%;
      width: 100%;
      display: flex;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }

    .basic-ever-container.dark {
      --background: 224 71% 4%;
      --foreground: 213 31% 91%;
      --primary: 210 40% 98%;
      --primary-foreground: 222.2 47.4% 1.2%;
      --secondary: 222.2 47.4% 11.2%;
      --secondary-foreground: 210 40% 98%;
      --destructive: 0 63% 31%;
      --destructive-foreground: 210 40% 98%;
    }

    .basic-ever-container button.bg-primary {
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }

    .basic-ever-container button.bg-secondary {
      background-color: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
    }

    .basic-ever-container button.bg-destructive {
      background-color: hsl(var(--destructive));
      color: hsl(var(--destructive-foreground));
    }

    .basic-ever-container button:hover {
      opacity: 0.9;
    }

    .basic-ever-container button:active {
      opacity: 0.8;
    }
  `;

	useEffect(() => {
		const mountedRoots = new Map<string, ReactDOM.Root>();

		const initTimer = setTimeout(() => {
			if (!editor?.DomComponents) {
				console.error('GrapesJS editor or DomComponents not initialized');
				return;
			}

			// Add the global styles to the editor
			editor.Css.addRules(globalStyles);

			if (!editor.DomComponents.getType('teams-essential-timer')) {
				editor.DomComponents.addType('teams-essential-timer', {
					defaults: {
						tagName: 'div',
						attributes: { class: 'default-teams-essential-timer-component' },
						draggable: 'true', // String value
						droppable: false // Boolean value
					},
					model: teamsBasicModel || {
						init() {
							console.warn('Using default teams essential model');
						}
					},
					view: teamsBasicView
				});

				editor.BlockManager.add('teams-essential-timer', {
					label: 'Essential Timer',
					category: 'Basic',
					content: '<div data-gjs-type="teams-essential-timer"></div>' // Updated to a string
				});
			}

			return () => {
				mountedRoots.forEach((root) => root.unmount());
				mountedRoots.clear();
			};
		}, 0);

		return () => {
			clearTimeout(initTimer);
		};
	}, [editor, theme, globalStyles]);

	return {};
};

export const teamsBasicComponent = {
	config: teamsBasicConfig,
	model: teamsBasicModel,
	view: teamsBasicView
};
