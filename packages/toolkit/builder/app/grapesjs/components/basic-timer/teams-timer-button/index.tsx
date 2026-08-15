import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useThemeUI } from 'theme-ui';
import { teamsTimerButtonConfig } from './config';
import { teamsTimerButtonModel } from './model';
import { teamsTimerButtonView } from './view';
export { TeamsTimerButton } from './component';
import { EditorProps } from '../../../types';

export const useTimerButton = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define primary and secondary colors
  const primaryColor = '#3826A6';
  const secondaryColor = '#A11DB1';

  const globalStyles = `
    .teams-timer-button-container {
      --primaryColor: ${primaryColor};
      --secondaryColor: ${secondaryColor};
      display: flex;
    }

    .teams-timer-button-container button {
      border-radius: 9999px;
      background: linear-gradient(135deg, #3826A6 0%, #A11DB1 100%);
      color: white;
      display: flex;
      transition: all 0.2s ease-in-out;
    }

    .teams-timer-button-container.bordered {
      padding: 2px;
      border-radius: 9999px;
      border-color: #FFFFFF ;
    }

    .teams-timer-button-container.bordered button {
      background: white;
      color: var(--secondaryColor);
    }

    .teams-timer-button-container button:hover {
      opacity: 0.9;
      transform: scale(1.05);
    }

    .teams-timer-button-container button:active {
      opacity: 0.8;
      transform: scale(0.95);
    }

    .teams-timer-button-container.dark {
      box-shadow: 0 25px 50px -12px rgb(255 255 255 / 0.25);
    }

    .teams-timer-button-container.disabled button {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .teams-timer-button-container button svg {
      color: white;
    }

    .teams-timer-button-container.bordered button svg {
      color: var(--secondaryColor);
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

      const mountedRoots = new Map<string, ReactDOM.Root>();

      if (!editor.DomComponents.getType('data-timer-button')) {
        editor.DomComponents.addType('data-timer-button', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-timer-button-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: teamsTimerButtonModel || {
            init() {
              console.warn('Using default timer button model');
            },
          },
          view: teamsTimerButtonView
        });

        editor.BlockManager.add('data-timer-button', {
          label: 'Timer Button',
          category: 'Basic',
          content: '<div data-gjs-type="data-timer-button"></div>' // Updated to a string
        });
      }

      return () => {
        mountedRoots.forEach(root => root.unmount());
        mountedRoots.clear();
      };
    }, 0);

    return () => {
      clearTimeout(initTimer);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const teamsTimerButtonComponent = {
  config: teamsTimerButtonConfig,
  model: teamsTimerButtonModel,
  view: teamsTimerButtonView
};
