/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
	content: [
		// Teams SDK packages
		'../../atoms/dist/**/*.js',
		'../../../ui/dist/**/*.js',
		// Your app content
		'./src/**/*.{js,ts,jsx,tsx}'
	],
	darkMode: ['class'],
	theme: {
		extend: {
			colors: {
				background: 'var(--background)',
				foreground: 'var(--foreground)'
			},
			animation: {
				'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				float: 'float 6s ease-in-out infinite',
				'spin-slow': 'spin 8s linear infinite',
				blob: 'blob 7s infinite'
			},
			keyframes: {
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-20px)' }
				},
				blob: {
					'0%, 100%': { transform: 'translate(0, 0) scale(1)' },
					'33%': { transform: 'translate(30px, -50px) scale(1.1)' },
					'66%': { transform: 'translate(-20px, 20px) scale(0.9)' }
				}
			}
		}
	},
	plugins: [animate]
};
