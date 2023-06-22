import { StaticImageData } from 'next/image';

export interface ThemeInterface {
	theme: string;
	text: string;
	image: StaticImageData;
	enabled: boolean;
}

export interface ThemesPopup {
	theme: string;
	currentTheme: string | undefined;
	text: string;
	image: StaticImageData;
	enabled: boolean;
	index: number;
	setTheme: (theme: string) => void;
}
