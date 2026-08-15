import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { areaChartConfig } from './config';
import { areaChartModel } from './model';
import { areaChartView } from './view';
import { EditorProps } from '../../../types';

export const useAreaChart = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define styles for area chart
  const globalStyles = `
    .area-chart-wrapper {
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }
    .area-chart-wrapper.dark {
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

      if (!editor.DomComponents.getType('basic-areachart')) {
        editor.DomComponents.addType('basic-areachart', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-area-chart-component' },
            draggable: 'true',
            droppable: false
          },
          model: areaChartModel || {
            init() {
              console.warn('Using default area chart model');
            },
          },
          view: areaChartView
        });

        editor.BlockManager.add('basic-areachart', {
          label: 'Area Chart',
          category: 'Basic',
          content: '<div data-gjs-type="basic-areachart"></div>'
        });
      }
    }, 0);

    return () => {
      clearTimeout(initChart);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const areaChartComponent = {
  config: areaChartConfig,
  model: areaChartModel,
  view: areaChartView
};
