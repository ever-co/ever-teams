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
		},
		extend: {
			colors: {
				transparent: 'transparent',
				current: 'currentColor',
				neutral: '#7E7991',
				'light--theme': {
					light: '#fff',
					DEFAULT: '#f7f7f8',
					dark: '#E7E7EA',
				},
				'dark--theme': {
					light: '#25272D',
					DEFAULT: '#1E2025',
				},
				primary: {
					DEFAULT: '#3826A6',
					light: '#6755C9',
				},
				dark: '#1A1C1E',
			},
			fontFamily: {},
		},
	},
	plugins: [],
};
