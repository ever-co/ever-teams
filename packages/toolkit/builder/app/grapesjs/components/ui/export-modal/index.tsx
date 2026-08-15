import { Theme } from 'theme-ui';
import { CreateExportModalProps, ExportModalContent, TabConfig, TabsProps } from '../../../types';
import { createTabs } from './Tabs';
import { createPreviewContainer } from './preview-container';
import { createExportButtons } from './export-buttons';

// Add default colors at the top of the file
const DEFAULT_COLORS = {
  text: '#000000',
  background: '#ffffff',
  primary: '#3826A6',
  muted: '#e5e5e5',
  darkText: '#ffffff',
  darkBackground: '#1a1a1a',
  darkPrimary: '#A11DB1',
  darkMuted: '#333333'
} as const;

const createExportModal = ({
  html,
  css,
  js,
  theme,
  colorMode,
  formatCode,
  handleExportJSON,
  handleExportNextJS
}: CreateExportModalProps) => {
  // Create safe colors object with fallbacks and ensure string types
  const isDark = colorMode === 'dark';
  const safeColors: Record<string, string> = {
    text: String(theme?.colors?.text || (isDark ? DEFAULT_COLORS.darkText : DEFAULT_COLORS.text)),
    background: String(theme?.colors?.background || (isDark ? DEFAULT_COLORS.darkBackground : DEFAULT_COLORS.background)),
    primary: String(theme?.colors?.primary || (isDark ? DEFAULT_COLORS.darkPrimary : DEFAULT_COLORS.primary)),
    muted: String(theme?.colors?.muted || (isDark ? DEFAULT_COLORS.darkMuted : DEFAULT_COLORS.muted))
  };

  const modalContent = document.createElement('div') as ExportModalContent;
  modalContent.style.cssText = `
    padding: 32px;
    height: 85vh;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
    background: ${safeColors.background};
    color: ${safeColors.text};
    display: flex;
    flex-direction: column;
  `;

  const { tabsContainer, previewContainer } = createTabs({
    tabs: [
      { label: 'HTML', code: html, language: 'html' },
      { label: 'CSS', code: css, language: 'css' },
      { label: 'JavaScript', code: js, language: 'javascript' }
    ],
    colors: safeColors,
    isDark,
    formatCode
  });

  modalContent.appendChild(tabsContainer);
  modalContent.appendChild(previewContainer);

  const buttonContainer = createExportButtons({
    colors: safeColors,
    isDark,
    handleExportJSON,
    handleExportNextJS
  });
  modalContent.appendChild(buttonContainer);

  // Now you can safely assign the updateContent property
  modalContent.updateContent = (content: { html: string; css: string; js: string }) => {
    const { html, css, js } = content;

    // Update the tabs with new content
    const { tabsContainer, previewContainer } = createTabs({
      tabs: [
        { label: 'HTML', code: html, language: 'html' },
        { label: 'CSS', code: css, language: 'css' },
        { label: 'JavaScript', code: js, language: 'javascript' }
      ],
      colors: safeColors,
      isDark,
      formatCode
    });

    // Clear existing content
    modalContent.innerHTML = '';

    // Add updated content
    modalContent.appendChild(tabsContainer);
    modalContent.appendChild(previewContainer);

    // Re-add the button container
    const buttonContainer = createExportButtons({
      colors: safeColors,
      isDark,
      handleExportJSON,
      handleExportNextJS
    });
    modalContent.appendChild(buttonContainer);
  };

  return modalContent;
};

export default createExportModal;
