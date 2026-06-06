import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { progressCircleModel } from './model';
import { progressCircleView } from './view';
import { EditorProps } from '../../types';

export const useProgressCircle = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  useEffect(() => {
    const initCircle = setTimeout(() => {
      if (!editor?.DomComponents) {
        console.error('GrapesJS editor or DomComponents not initialized');
        return;
      }

      if (!editor.DomComponents.getType('basic-progress-circle')) {
        editor.DomComponents.addType('basic-progress-circle', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-progress-circle-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: progressCircleModel || {
            init() {
              console.warn('Using default progress circle model');
            },
          },
          view: progressCircleView
        });
      }
    }, 0);

    return () => {
      clearTimeout(initCircle);
    };
  }, [editor, theme]);

  return {};
};
