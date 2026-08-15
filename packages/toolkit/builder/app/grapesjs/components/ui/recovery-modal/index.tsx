import { AutosaveData } from "../../../types";

interface RecoveryModalProps {
    savedData: AutosaveData;
    onRestore: () => void;
    onDiscard: () => void;
    colors: Record<string, string>;
    isDark: boolean;
}

// Add default colors
const DEFAULT_COLORS = {
    text: '#000000',
    background: '#ffffff',
    primary: '#3826A6',
    muted: '#e5e5e5',
    darkText: '#ffffff',
    darkBackground: '#1a1a1a',
    darkPrimary: '#A11DB1',
    darkMuted: '#333333'
};

export const createRecoveryModal = ({
    savedData,
    onRestore,
    onDiscard,
    colors = {},
    isDark = false
}: RecoveryModalProps) => {
    // Merge default colors with provided colors
    const safeColors = {
        text: colors.text || (isDark ? DEFAULT_COLORS.darkText : DEFAULT_COLORS.text),
        background: colors.background || (isDark ? DEFAULT_COLORS.darkBackground : DEFAULT_COLORS.background),
        primary: colors.primary || (isDark ? DEFAULT_COLORS.darkPrimary : DEFAULT_COLORS.primary),
        muted: colors.muted || (isDark ? DEFAULT_COLORS.darkMuted : DEFAULT_COLORS.muted)
    };

    const container = document.createElement('div');
    container.style.cssText = `
    padding: 20px;
    color: ${safeColors.text};
    background: ${safeColors.background};
  `;

    const message = document.createElement('p');
    message.textContent = `We found an autosaved version from ${new Date(savedData.lastModified).toLocaleString()}. Would you like to restore it?`;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
    display: flex;
    gap: 10px;
    margin-top: 20px;
  `;

    const restoreButton = document.createElement('button');
    restoreButton.textContent = 'Restore';
    restoreButton.onclick = onRestore;
    restoreButton.style.cssText = `
    background: ${safeColors.primary};
    color: ${isDark ? safeColors.background : '#ffffff'};
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

    const discardButton = document.createElement('button');
    discardButton.textContent = 'Discard';
    discardButton.onclick = onDiscard;
    discardButton.style.cssText = `
    background: ${safeColors.muted};
    color: ${safeColors.text};
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

    buttonContainer.appendChild(restoreButton);
    buttonContainer.appendChild(discardButton);
    container.appendChild(message);
    container.appendChild(buttonContainer);

    return container;
};
