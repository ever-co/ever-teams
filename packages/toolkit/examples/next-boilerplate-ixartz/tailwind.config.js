/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
	content: [
		// Teams SDK packages
		'../../atoms/dist/**/*.js',
		'../../../ui/dist/**/*.js',
		// Your app content
		'./src/app/**/*.{js,ts,jsx,tsx}',
		'./src/components/**/*.{js,ts,jsx,tsx}',
		'./src/templates/**/*.{js,ts,jsx,tsx}'
	],

	// ... other configurations
	plugins: [animate]
};
