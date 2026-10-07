import { TThemePreviewVariant } from '@/core/components/common/theme-preview';

export interface ThemeInterface {
	theme: TThemePreviewVariant;
	text: string;
	enabled: boolean;
}

export interface ThemesPopup {
	theme: TThemePreviewVariant;
	currentTheme: string | undefined;
	text: string;
	enabled: boolean;
	index: number;
	setTheme: (theme: string) => void;
}
