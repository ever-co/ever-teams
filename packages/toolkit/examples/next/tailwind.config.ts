import type { Config } from 'tailwindcss';
import sharedConfig from '@ever-teams/tailwind-config';

export default {
	presets: [sharedConfig],
	darkMode: ['class'],
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
		'../../../toolkit/atoms/dist/**/*.js',
		'../../../ui/dist/**/*.js'
	],
	theme: {
		extend: {
			colors: {
				background: 'var(--background)',
				foreground: 'var(--foreground)'
			}
		}
	},
	plugins: [require('tailwindcss-animate')]
} satisfies Config;
