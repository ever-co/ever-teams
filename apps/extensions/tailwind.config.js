/** @type {import('tailwindcss/tailwind-config').TailwindConfig} */
module.exports = {
	mode: 'jit',
	// The popup follows the browser's light or dark theme
	darkMode: 'media',
	content: ['./**/*.{ts,tsx}'],
	theme: {
		fontFamily: {
			sans: ['Inter', 'sans-serif'],
			serif: ['Georgia', 'serif']
		}
	},
	variants: { extend: { typography: ['dark'] } },
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};
