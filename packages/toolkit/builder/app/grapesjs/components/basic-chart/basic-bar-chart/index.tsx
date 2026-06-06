import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { barChartConfig } from './config';
import { barChartModel } from './model';
import { barChartView } from './view';
import { EditorProps } from '../../../types';

export const useBarChart = ({ editor }: EditorProps) => {
    const { theme } = useThemeUI();

    // Define styles for bar chart
    const globalStyles = `
        .bar-chart-wrapper {
            padding: 1.5rem;
            border-radius: 0.75rem;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 1.25rem;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
        }
        .bar-chart-wrapper.dark {
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

            if (!editor.DomComponents.getType('basic-barchart')) {
                editor.DomComponents.addType('basic-barchart', {
                    defaults: {
                        tagName: 'div',
                        attributes: { class: 'default-bar-chart-component' },
                        draggable: 'true',
                        droppable: false
                    },
                    model: barChartModel || {
                        init() {
                            console.warn('Using default bar chart model');
                        },
                    },
                    view: barChartView
                });

                editor.BlockManager.add('basic-barchart', {
                    label: 'Bar Chart',
                    category: 'Basic',
                    content: '<div data-gjs-type="basic-barchart"></div>'
                });
            }
        }, 0);

        return () => {
            clearTimeout(initChart);
        };
    }, [editor, theme, globalStyles]);

    return {};
};

export const barChartComponent = {
    config: barChartConfig,
    model: barChartModel,
    view: barChartView
};
