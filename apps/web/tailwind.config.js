const { createGlobPatternsForDependencies } = require('@nrwl/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		join(
			__dirname,
			'{src,pages,components}/**/*!(*.stories|*.spec).{ts,tsx,html}'
		),
		...createGlobPatternsForDependencies(__dirname),
	],
	theme: {
		screens: {
			xs: '414px',
			sm: '640px',
			md: '768px',
			lg: '976px',
			xl: '1440px',
		},
		extend: {
			colors: {
				transparent: 'transparent',
				current: 'currentColor',
				light: {
					DEFAULT: '#7e7e8f',
				},
				primary: {
					DEFAULT: '#1B005D',
					light: '#ACB3BB',
					lighter: '#3E1DAD',
					disabled: '#EDF8F6',
				},
				main_background: {
					DEFAULT: '#F9FAFB',
				},
				dark_background_color: {
					DEFAULT: '#202023',
				},

				dark_card_background_color: {
					DEFAULT: '#101014',
				},
				button_dark: {
					DEFAULT: '#fa754e',
				},
				label: {
					DEFAULT: '#07074D',
				},
			},
		},
	},
	plugins: [],
};
