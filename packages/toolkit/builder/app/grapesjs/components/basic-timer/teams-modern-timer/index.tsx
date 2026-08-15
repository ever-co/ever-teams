import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { modernTimerConfig } from './config';
import { modernTimerModel } from './model';
import { modernTimerView } from './view';
import { EditorProps } from '../../../types';

export const useModernTimer = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define primary and secondary colors
  const primaryColor = '#3826A6';
  const secondaryColor = '#A11DB1';

  const globalStyles = `
    .modern-teams-wrapper {
      --primaryColor: ${primaryColor};
      --secondaryColor: ${secondaryColor};
      --progress-background: rgba(161, 29, 177, 0.5);
      backdrop-filter: blur(8px);
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      border-color: #A11DB1;
    }
    .modern-teams-wrapper.dark {
      background-color: black;
      box-shadow: 0 25px 50px -12px rgb(255 255 255 / 0.5);
    }
    .modern-teams-wrapper [data-state="indeterminate"][data-max="100"].h-full {
      background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}) !important;
    }
    .modern-teams-wrapper [role="progressbar"].bg-secondary {
      background: rgba(161, 29, 177, 0.3) !important;
    }
    .modern-teams-wrapper button.rounded-full {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: white;
    }
    .modern-teams-wrapper button:hover {
      opacity: 0.9;
    }
    .modern-teams-wrapper button:active {
      opacity: 0.8;
    }
  `;

  useEffect(() => {
    const initTimer = setTimeout(() => {
      if (!editor?.DomComponents) {
        console.error('GrapesJS editor or DomComponents not initialized');
        return;
      }

      // Add the global styles to the editor
      editor.Css.addRules(globalStyles);

      if (!editor.DomComponents.getType('basic-timer-modern')) {
        editor.DomComponents.addType('basic-timer-modern', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-modern-timer-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: modernTimerModel || {
            init() {
              console.warn('Using default modern timer model');
            },
          },
          view: modernTimerView
        });

        editor.BlockManager.add('basic-timer-modern', {
          label: 'Modern Timer',
          category: 'Basic',
          content: '<div data-gjs-type="basic-timer-modern"></div>' // Updated to a string
        });
      }
    }, 0);

    return () => {
      clearTimeout(initTimer);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const modernTimerComponent = {
  config: modernTimerConfig,
  model: modernTimerModel,
  view: modernTimerView
};
