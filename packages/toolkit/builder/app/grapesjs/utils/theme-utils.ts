import { Theme } from 'theme-ui';
import { GrapesJSEditor } from '../types';

export const applyThemeToEditor = (editor: GrapesJSEditor, theme: Theme, colorMode: 'light' | 'dark' = 'light'): void => {
  const colors = theme.colors as Record<string, any>;
  const mainColor = colorMode === 'dark' ? colors.background : colors.muted;

  const globalStyles = `
    body {
      color: ${colors.text} !important;
      background: ${mainColor} !important;
    }
    
    .gjs-one-bg { background-color: ${colors.background} !important; }
    .gjs-two-color { color: ${colors.text} !important; }
    .gjs-three-bg {
      background-color: ${colors.primary} !important;
      color: ${colors.background} !important;
    }
    .gjs-four-color { color: ${colors.primary} !important; }
    .gjs-four-color-h:hover { color: ${colors.secondary} !important; }
  `;

  clearExistingStyles(editor);
  editor.addStyle(globalStyles);
  editor.refresh();
};

export const clearExistingStyles = (editor: GrapesJSEditor): void => {
  const styleManager = editor.Css;
  const rules = styleManager.getAll();

  rules?.forEach((rule: any) => {
    if (rule?.selectorsToString && rule.selectorsToString().includes('gjs-')) {
      styleManager.remove(rule);
    }
  });
};
