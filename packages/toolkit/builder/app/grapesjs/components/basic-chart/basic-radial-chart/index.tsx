import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { radialChartConfig } from './config';
import { radialChartModel } from './model';
import { radialChartView } from './view';
export { BasicRadialChart } from './component';
import { EditorProps } from '../../../types';

export const useRadialChart = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  const globalStyles = `
    .radial-chart-wrapper {
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }
    .radial-chart-wrapper.dark {
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

      if (!editor.DomComponents.getType('basic-radialchart')) {
        editor.DomComponents.addType('basic-radialchart', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-radial-chart-component' },
            draggable: 'true',
            droppable: false
          },
          model: radialChartModel || {
            init() {
              console.warn('Using default radial chart model');
            },
          },
          view: radialChartView
        });

        editor.BlockManager.add('basic-radialchart', {
          label: 'Radial Chart',
          category: 'Basic',
          content: '<div data-gjs-type="basic-radialchart"></div>'
        });
      }
    }, 0);

    return () => {
      clearTimeout(initChart);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const radialChartComponent = {
  config: radialChartConfig,
  model: radialChartModel,
  view: radialChartView
};
