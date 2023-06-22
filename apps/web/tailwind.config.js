const { createGlobPatternsForDependencies } = require('@nrwl/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		join(
			__dirname,
			'{src,pages,components,lib}/**/*!(*.stories|*.spec).{ts,tsx,html}'
		),
		...createGlobPatternsForDependencies(__dirname),
	],
	theme: {
		screens: {
			xs: '414px',
			sm: '576px',
			md: '768px',
			lg: '992px',
			xl: '1200px',
			'2xl': '1400px',
			'3xl': '1600px',
		},
		extend: {
			colors: {
				transparent: 'transparent',
				current: 'currentColor',
				neutral: '#7E7991',
				default: {
					DEFAULT: '#282048',
				},
				'light--theme': {
					light: '#fff',
					DEFAULT: '#f7f7f8',
					dark: '#E7E7EA',
				},
				'dark--theme': {
					light: '#25272D',
					DEFAULT: 'var(--tw-color-dark--theme)',
				},
				primary: {
					DEFAULT: '#3826A6',
					light: '#6755C9',
					xlight: '#8E76FA',
					mid: '#483A95',
				},
				dark: {
					high: '#16171B',
					lighter: '#1E2430',
					DEFAULT: '#1A1C1E',
				},

				'regal-blue': '#6A71E7',
				'regal-rose': '#E93CB9',
			},
			fontFamily: {
				PlusJakartaSans: ['Plus-Jakarta-Sans-VariableFont_wght'],
				PlusJakartaSansRegular: ['Plus-Jakarta-Sans-Regular'],
				PlusJakartaSansBold: ['Plus-Jakarta-Sans-Bold'],
				PlusJakartaSansLight: ['Plus-Jakarta-Sans-Light'],
				PlusJakartaSansMedium: ['Plus-Jakarta-Sans-Medium'],
				PlusJakartaSansSemiBold: ['Plus-Jakarta-Sans-SemiBold'],
			},
			boxShadow: {
				lgcard: '0px 50px 200px rgba(0, 0, 0, 0.1)',
				xlcard: '0px 16px 79px rgba(0, 0, 0, 0.12)',
				'lgcard-white': '0px 50px 200px rgba(255, 255, 255, 0.1)',
				'xlcard-white': '0px 16px 79px rgba(255, 255, 255, 0.12)',
				darker:
					'-8px -9px 14px rgba(255, 255, 255, 0.05), 10px 14px 34px rgba(0, 0, 0, 0.6), 0px 4px 24px rgba(0, 0, 0, 0.25)',
			},
		},
	},
	plugins: [],
};
