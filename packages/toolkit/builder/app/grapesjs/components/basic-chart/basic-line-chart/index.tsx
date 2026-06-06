import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useThemeUI } from 'theme-ui';
import { lineChartConfig } from './config';
import { lineChartModel } from './model';
import { lineChartView } from './view';
export { BasicLineChart } from './component';
import { EditorProps } from '../../../types';

export const useLineChart = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define styles for line chart
  const globalStyles = `
    .line-chart-container {
      width: 100%;
      height: 100%;
      min-height: 300px;
      position: relative;
    }
    .line-chart-wrapper {
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      width: 100%;
      height: 100%;
      min-height: 300px;
    }
    .line-chart-wrapper.dark {
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

      if (!editor.DomComponents.getType('basic-linechart')) {
        editor.DomComponents.addType('basic-linechart', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-line-chart-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: lineChartModel || {
            init() {
              console.warn('Using default line chart model');
            },
          },
          view: lineChartView
        });

        editor.BlockManager.add('basic-linechart', {
          label: 'Line Chart',
          category: 'Basic',
          content: '<div data-gjs-type="basic-linechart"></div>' // Updated to a string
        });
      }
    }, 0);

    return () => {
      clearTimeout(initChart);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const lineChartComponent = {
  config: lineChartConfig,
  model: lineChartModel,
  view: lineChartView
};
