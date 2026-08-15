import { useEffect } from 'react';
import { useThemeUI } from 'theme-ui';
import { calendarModel } from './model';
import { calendarView } from './view';
import { EditorProps } from '../../types';
import { basicCalendarConfig } from './config';

export const useCalendar = ({ editor }: EditorProps) => {
  const { theme } = useThemeUI();

  const globalStyles = `
    @media (prefers-color-scheme: light) {
  .calendar-container button[name="previous-month"],
  .calendar-container button[name="next-month"] {
    border: 1px solid #696969;
    color: #696969;
  }
}
  `;

  useEffect(() => {
    const initCalendar = setTimeout(() => {
      if (!editor?.DomComponents) {
        console.error('GrapesJS DomComponents not found or not initialized properly.');
        return;
      }

      // Add the global styles to the editor
      editor.Css.addRules(globalStyles);

      if (!editor.DomComponents.getType('basic-calendar')) {
        editor.DomComponents.addType('basic-calendar', {
          defaults: {
            tagName: 'div',
            attributes: { class: 'default-calendar-component' },
            draggable: 'true',
            droppable: false
          },
          model: calendarModel || {
            init() {
              console.warn('Using default calendar model');
            },
          },
          view: calendarView,
        });
      }
    }, 0);

    return () => {
      clearTimeout(initCalendar);
    };
  }, [editor, theme, globalStyles]);

  return {};
};

export const calendarComponent = {
  config: basicCalendarConfig,
  model: calendarModel,
  view: calendarView
};
