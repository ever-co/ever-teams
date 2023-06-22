import { StaticImageData } from 'next/image';

export interface ThemeInterface {
	theme: string;
	text: string;
	image: StaticImageData;
	enabled: boolean;
}
