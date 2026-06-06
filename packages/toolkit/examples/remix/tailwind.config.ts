import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
	content: ['./app/**/*.{js,jsx,ts,tsx}', '../../atoms/dist/**/*.js', '../../../ui/dist/**/*.js'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				primary: '#3826A6',
				secondary: '#786bcd'
			},
			fontFamily: {
				sans: [
					'Inter',
					'ui-sans-serif',
					'system-ui',
					'sans-serif',
					'Apple Color Emoji',
					'Segoe UI Emoji',
					'Segoe UI Symbol',
					'Noto Color Emoji'
				]
			}
		}
	},
	plugins: [animate]
} satisfies Config;
