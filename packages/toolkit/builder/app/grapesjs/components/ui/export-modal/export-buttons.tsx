import { ExportButtonsProps } from '../../../types';

export const createExportButtons = ({
  colors,
  isDark,
  handleExportJSON,
  handleExportNextJS
}: ExportButtonsProps) => {
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    margin-top: 16px;
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  `;

  const nextButton = createButton({
    label: 'Export as Next.js',
    isPrimary: true,
    colors,
    isDark,
    onClick: handleExportNextJS
  });

  const jsonButton = createButton({
    label: 'Save Template',
    isPrimary: false,
    colors,
    isDark,
    onClick: handleExportJSON
  });

  buttonContainer.appendChild(nextButton);
  buttonContainer.appendChild(jsonButton);

  return buttonContainer;
};

const createButton = ({
  label,
  isPrimary,
  colors,
  isDark,
  onClick
}: any) => {
  const button = document.createElement('button');
  button.innerHTML = label;
  button.style.cssText = `
    padding: 12px 24px;
    background: ${isPrimary ? '#9f9191' : '#9f9191'};
    color: ${isPrimary ? 'white' : '#20221d'};
    border: ${isPrimary ? 'none' : `1px solid ${colors.border}`};
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    ${isPrimary ? `box-shadow: 0 2px 4px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'}` : ''}
  `;

  if (!isPrimary) {
    button.onmouseover = () => {
      button.style.background = isDark ? '#c5b7b7' : '#c5b7b7';
    };
    button.onmouseout = () => {
      button.style.background = '#9f9191';
    };
  }

  button.onclick = onClick;
  return button;
};
