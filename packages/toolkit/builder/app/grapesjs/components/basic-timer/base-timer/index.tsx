import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useThemeUI } from 'theme-ui';
import { timerModel } from './model';
import { timerView } from './view';
import { timerConfig } from './config';
export { TeamsBasicTimer } from './component';
import { EditorProps } from '../../../types';

export const useTimer = ({ editor }: EditorProps) => {
	const { theme } = useThemeUI();

	const globalStyles = `
    .basic-timer-container {
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
    }

    .basic-timer-container.dark {
      --background: 224 71% 4%;
      --foreground: 213 31% 91%;
      --primary: 210 40% 98%;
      --primary-foreground: 222.2 47.4% 1.2%;
      --secondary: 222.2 47.4% 11.2%;
      --secondary-foreground: 210 40% 98%;
      --destructive: 0 63% 31%;
      --destructive-foreground: 210 40% 98%;
    }

    button.bg-primary {
      background-color: hsl(var(--primary));
    }

    button.bg-secondary {
      background-color: hsl(var(--secondary));
    }

    button.bg-destructive {
      background-color: hsl(var(--destructive));
    }

    button:hover {
      opacity: 0.9;
    }

    button:active {
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

			if (!editor.DomComponents.getType('basic-timer')) {
				editor.DomComponents.addType('basic-timer', {
					defaults: {
						tagName: 'div',
						attributes: { class: 'default-timer-component' },
						draggable: 'true', // String value
						droppable: false // Boolean value
					},
					model: timerModel || {
						init() {
							console.warn('Using default timer model');
						}
					},
					view: timerView
				});

				editor.BlockManager.add('basic-timer', {
					label: 'Basic Timer',
					category: 'Basic',
					content: '<div data-gjs-type="basic-timer"></div>' // Updated to a string
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

export const timerComponent = {
	config: timerConfig,
	model: timerModel,
	view: timerView
};
