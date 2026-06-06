import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { basicDatePickerConfig } from './config';
import { datePickerModel } from './model';
import { datePickerView } from './view';
import { EditorProps } from '../../../types';

export const useDatePicker = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define primary and secondary colors
  const primaryColor = '#030711';
  const secondaryColor = '#1d283a';

  const globalStyles = `
    .date-picker-container button {
      --primaryColor: ${primaryColor};
      --secondaryColor: ${secondaryColor};
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-color: ${secondaryColor} !important;
      background-color: ${primaryColor} !important;
      padding: 0.5rem 1rem;
      color: #ffffff !important;
    }
  `;

  useEffect(() => {
    const initDatePicker = setTimeout(() => {
      if (!editor?.DomComponents) {
        console.error('GrapesJS editor or DomComponents not initialized');
        return;
      }

      // Add the global styles to the editor
      editor.Css.addRules(globalStyles);

      if (!editor.DomComponents.getType('basic-datepicker')) {
        editor.DomComponents.addType('basic-datepicker', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-datepicker-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: datePickerModel || {
            init() {
              console.warn('Using default date picker model');
            },
          },
          view: datePickerView
        });

        editor.BlockManager.add('basic-datepicker', {
          label: 'Date Picker',
          category: 'Basic',
          content: '<div data-gjs-type="basic-datepicker"></div>' // Updated to a string
        });
      }
    }, 0);

    return () => {
      clearTimeout(initDatePicker);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const datePickerComponent = {
  config: basicDatePickerConfig,
  model: datePickerModel,
  view: datePickerView
};
