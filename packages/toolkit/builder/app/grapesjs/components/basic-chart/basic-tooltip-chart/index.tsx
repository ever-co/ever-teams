import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { tooltipChartConfig } from './config';
import { tooltipChartModel } from './model';
import { tooltipChartView } from './view';
import { EditorProps } from '../../../types';

export const useTooltipChart = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define styles for tooltip chart
  const globalStyles = `
    .tooltip-chart-wrapper {
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }
    .tooltip-chart-wrapper.dark {
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

      if (!editor.DomComponents.getType('basic-tooltipchart')) {
        editor.DomComponents.addType('basic-tooltipchart', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-tooltip-chart-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: tooltipChartModel || {
            init() {
              console.warn('Using default tooltip chart model');
            },
          },
          view: tooltipChartView
        });

        editor.BlockManager.add('basic-tooltipchart', {
          label: 'Tooltip Chart',
          category: 'Basic',
          content: '<div data-gjs-type="basic-tooltipchart"></div>' // Updated to a string
        });
      }
    }, 0);

    return () => {
      clearTimeout(initChart);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const tooltipChartComponent = {
  config: tooltipChartConfig,
  model: tooltipChartModel,
  view: tooltipChartView
};
