import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { basicMemberConfig } from './config';
import { memberModel } from './model';
import { memberView } from './view';
import { EditorProps } from '../../types';

export const useMember = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  // Define primary and secondary colors
  const primaryColor = '#3826A6';
  const secondaryColor = '#A11DB1';

  const globalStyles = `
    .basic-member-wrapper {
      --primaryColor: ${primaryColor};
      --secondaryColor: ${secondaryColor};
      --progress-background: rgba(16, 185, 129, 0.5);
      backdrop-filter: blur(8px);
      padding: 1.5rem;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1.25rem;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      border-color: ${secondaryColor};
    }
    .basic-member-wrapper.dark {
      background-color: black;
      box-shadow: 0 25px 50px -12px rgb(255 255 255 / 0.5);
    }
    .basic-member-wrapper [data-state="indeterminate"][data-max="100"].h-full {
      background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}) !important;
    }
    .basic-member-wrapper [role="progressbar"].bg-secondary {
      background: rgba(16, 185, 129, 0.3) !important;
    }
  `;

  useEffect(() => {
    const initMember = setTimeout(() => {
      if (!editor?.DomComponents) {
        console.error('GrapesJS editor or DomComponents not initialized');
        return;
      }

      // Add the global styles to the editor
      editor.Css.addRules(globalStyles);

      if (!editor.DomComponents.getType('basic-member')) {
        editor.DomComponents.addType('basic-member', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-member-component' },
            draggable: 'true', // String value
            droppable: false // Boolean value
          },
          model: memberModel || {
            init() {
              console.warn('Using default member model');
            },
          },
          view: memberView
        });

        editor.BlockManager.add('basic-member', {
          label: 'Member',
          category: 'Basic',
          content: '<div data-gjs-type="basic-member"></div>' // Updated to a string
        });
      }
    }, 0);

    return () => {
      clearTimeout(initMember);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const memberComponent = {
  config: basicMemberConfig,
  model: memberModel,
  view: memberView
};
