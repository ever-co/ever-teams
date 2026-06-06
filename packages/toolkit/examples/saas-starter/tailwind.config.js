/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
	darkMode: 'class',
	content: [
		'./app/**/*.{js,ts,jsx,tsx}',
		'./pages/**/*.{js,ts,jsx,tsx}',
		'./components/**/*.{js,ts,jsx,tsx}',
		'../../../toolkit/atoms/dist/**/*.js',
		'../../../ui/dist/**/*.js'
	],
	plugins: [animate]
};
