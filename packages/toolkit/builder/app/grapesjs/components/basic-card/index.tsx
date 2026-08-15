import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { cardModel } from './model';
import { cardView } from './view';
import { EditorProps } from '../../types';

export { CardTeamsReportDisplayer } from './component';

export const useCardTeamsReportDisplayer = ({ editor }: EditorProps) => {
  useEffect(() => {
    const initCardDisplayer = setTimeout(() => {
      if (!editor?.DomComponents) {
        console.error('GrapesJS DomComponents not found or not initialized properly.');
        return;
      }

      const mountedRoots = new Map<string, ReactDOM.Root>();

      if (!editor.DomComponents.getType('card-teams-report-displayer')) {
        editor.DomComponents.addType('card-teams-report-displayer', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-card-component' },
            draggable: 'true',
            droppable: false
          },
          model: cardModel || {
            init() {
              console.warn('Using default card model');
            },
          },
          view: cardView
        });
      }

      return () => {
        mountedRoots.forEach(root => root.unmount());
        mountedRoots.clear();
      };
    }, 0);

    return () => {
      clearTimeout(initCardDisplayer);
    };
  }, [editor]);

  return {};
};
