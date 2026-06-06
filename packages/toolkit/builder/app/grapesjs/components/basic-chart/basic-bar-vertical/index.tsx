import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { barChartVerticalConfig } from './config';
import { barChartVerticalModel } from './model';
import { barChartVerticalView } from './view';
import { EditorProps } from '../../../types';

export const useBarChartVertical = ({ editor }: EditorProps) => {
	const { theme } = useThemeUI();

	// Define styles for bar vertical chart
	const globalStyles = `
        .bar-horizontal-chart-wrapper {
            padding: 1.5rem;
            border-radius: 0.75rem;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 1.25rem;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
        }
        .bar-horizontal-chart-wrapper.dark {
            background-color: black;
            box-shadow: 0 25px 50px -12px rgb(255 255 255 / 0.5);
        }
    `;

	useEffect(() => {
		const initChart = setTimeout(() => {
			if (!editor?.DomComponents) {
				console.error('GrapesJS editor or DomComponents not initialized');
				return;
			}

			// Add the global styles to the editor
			editor.Css.addRules(globalStyles);

			if (!editor.DomComponents.getType('basic-chart-vertical')) {
				editor.DomComponents.addType('basic-chart-vertical', {
					defaults: {
						tagName: 'div',
						attributes: { class: 'default-bar-horizontal-chart-component' },
						draggable: 'true',
						droppable: false
					},
					model: barChartVerticalModel || {
						init() {
							console.warn('Using default bar vertical chart model');
						}
					},
					view: barChartVerticalView
				});

				editor.BlockManager.add('basic-chart-vertical', {
					label: 'Vertical Bar Chart',
					category: 'Basic',
					content: '<div data-gjs-type="basic-chart-vertical"></div>'
				});
			}
		}, 0);

		return () => {
			clearTimeout(initChart);
		};
	}, [editor, theme, globalStyles]);

	return {};
};

export const barChartVerticalComponent = {
	config: barChartVerticalConfig,
	model: barChartVerticalModel,
	view: barChartVerticalView
};
