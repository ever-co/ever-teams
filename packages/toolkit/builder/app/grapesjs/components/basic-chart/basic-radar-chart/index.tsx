import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { radarChartConfig } from './config';
import { radarChartModel } from './model';
import { radarChartView } from './view';
import { EditorProps } from '../../../types';

export const useRadarChart = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  const globalStyles = `
    .radar-chart-wrapper {
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }
    .radar-chart-wrapper.dark {
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

      editor.Css.addRules(globalStyles);

      if (!editor.DomComponents.getType('basic-radarchart')) {
        editor.DomComponents.addType('basic-radarchart', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-radar-chart-component' },
            draggable: 'true',
            droppable: false
          },
          model: radarChartModel || {
            init() {
              console.warn('Using default radar chart model');
            },
          },
          view: radarChartView
        });

        editor.BlockManager.add('basic-radarchart', {
          label: 'Radar Chart',
          category: 'Basic',
          content: '<div data-gjs-type="basic-radarchart"></div>'
        });
      }
    }, 0);

    return () => {
      clearTimeout(initChart);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const radarChartComponent = {
  config: radarChartConfig,
  model: radarChartModel,
  view: radarChartView
};
