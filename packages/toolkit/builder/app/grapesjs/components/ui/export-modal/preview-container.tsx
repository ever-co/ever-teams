import { PreviewContainerProps } from "../../../types";

export const createPreviewContainer = ({ colors, isDark }: PreviewContainerProps) => {
  const container = document.createElement('div');
  container.style.cssText = `
    flex: 1;
    background: ${isDark ? '#1e1e1e' : '#f8f8f8'};
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow: hidden;
    position: relative;
    height: calc(100% - 120px);
  `;
  return container;
};
