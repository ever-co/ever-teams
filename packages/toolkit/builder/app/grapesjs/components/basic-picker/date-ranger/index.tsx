import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { dateRangerModel } from './model';
import { dateRangerView } from './view';
import { EditorProps } from '../../../types';

export const useDateRanger = ({ editor }: EditorProps) => {
	const { theme } = useThemeUI();

	const globalStyles = `
    .date-ranger-wrapper {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  `;

	useEffect(() => {
		const initDateRanger = setTimeout(() => {
			if (!editor?.DomComponents) {
				console.error('GrapesJS editor or DomComponents not initialized');
				return;
			}

			// Add the global styles to the editor
			editor.Css.addRules(globalStyles);

			if (!editor.DomComponents.getType('basic-date-ranger')) {
				editor.DomComponents.addType('basic-date-ranger', {
					defaults: {
						tagName: 'div',
						attributes: { class: 'default-date-ranger-component' },
						draggable: 'true', // String value
						droppable: false // Boolean value
					},
					model: dateRangerModel || {
						init() {
							console.warn('Using default date ranger model');
						},
					},
					view: dateRangerView
				});

				editor.BlockManager.add('basic-date-ranger', {
					label: 'Date Range',
					category: 'Basic',
					content: '<div data-gjs-type="basic-date-ranger"></div>' // Updated to a string
				});
			}
		}, 0);

		return () => {
			clearTimeout(initDateRanger);
		};
	}, [editor, theme, globalStyles]);

	return {};
};
