'use client';
import { useEffect, useCallback } from 'react';
import { Theme } from 'theme-ui';
import { GrapesJSEditor } from '../types';
import { GrapesJSErrorType } from '../constants/error-types';
import { GrapesJSError } from '../utils/error-handler';

interface UseThemeProps {
	editor: GrapesJSEditor | null;
	theme: Theme;
	colorMode?: 'light' | 'dark';
}

export const useTheme = ({ editor, theme, colorMode = 'light' }: UseThemeProps) => {
	const getThemeColors = useCallback(() => {
		const isDarkMode = colorMode === 'dark';
		return {
			text: (theme.colors?.text as string) || (isDarkMode ? '#ffffff' : '#000000'),
			background: (theme.colors?.background as string) || (isDarkMode ? '#1a1a1a' : '#ffffff'),
			border: (theme.colors?.border as string) || (isDarkMode ? '#333333' : '#e5e5e5'),
			primary: (theme.colors?.primary as string) || (isDarkMode ? '#A11DB1' : '#3826A6'),
			mainColor: isDarkMode
				? 'linear-gradient(135deg, #2a2a2a 0%, #323232 100%)'
				: 'linear-gradient(135deg, #ebebeb 0%, #ebebeb 100%)'
		};
	}, [theme, colorMode]);

	useEffect(() => {
		if (!editor?.Css) return;

		try {
			const colors = getThemeColors();
			const globalStyles = generateGlobalStyles(colors);

			// Clear existing GrapesJS styles
			const styleManager = editor.Css;
			const rules = styleManager.getAll();

			rules?.forEach((rule: any) => {
				if (rule?.selectorsToString?.()) {
					const selectors = rule.selectorsToString();
					if (selectors?.includes('gjs-')) {
						styleManager.remove(rule);
					}
				}
			});

			// Add new styles
			editor.addStyle(globalStyles);
			editor.refresh();
		} catch (error) {
			throw new GrapesJSError(GrapesJSErrorType.THEME_ERROR, 'theme', `Failed to apply theme: ${error}`);
		}
	}, [editor, theme, colorMode, getThemeColors]);

	return {
		getThemeColors
	};
};

const generateGlobalStyles = (colors: Record<string, string>) => {
	// Reference the existing theme styles from useGrapesJSTheming.ts
	return `
    body {
      color: ${colors.text} !important;
      background: ${colors.mainColor} !important;
    }

    .gjs-one-bg { background-color: ${colors.background} !important; }
    .gjs-two-color { color: ${colors.text} !important; }
    .gjs-three-bg {
      background-color: ${colors.primary} !important;
      color: ${colors.background} !important;
    }
    .gjs-four-color { color: ${colors.primary} !important; }
    .gjs-four-color-h:hover { color: ${colors.primary} !important; }

    /* Additional styles referenced from useGrapesJSTheming.ts */
    .gjs-cv-canvas,
    .gjs-pn-views-container,
    .gjs-pn-views,
    #gjs-cv-wrapper {
      background-color: ${colors.background} !important;
    }

    .gjs-frame-wrapper { background: ${colors.mainColor} !important; }

    .gjs-pn-btn.gjs-pn-active {
      background-color: ${colors.primary} !important;
      color: ${colors.background} !important;
    }

    .gjs-block { border-color: ${colors.border}; }
    .gjs-block:hover { border-color: ${colors.primary}; }

    .gjs-pn-panel,
    .gjs-sm-sector,
    .gjs-clm-tags,
    .gjs-sm-property {
      border-color: ${colors.border};
    }

    #gjs { border: none !important; }

    .gjs-preview { pointer-events: all !important; }
    .gjs-preview .gjs-frame { border: none !important; }
    .gjs-preview .gjs-toolbar,
    .gjs-preview .gjs-badge { display: none !important; }
  `;
};
