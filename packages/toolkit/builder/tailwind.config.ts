import type { Config } from 'tailwindcss';

const config = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
		'./app/plasmic/**/*.{js,ts,jsx,tsx}',
		'./plasmic/plasmic-host/**/*.{js,ts,jsx,tsx}',
		'./editor/**/*.{js,ts,jsx,tsx}',
		'./craft/**/*.{js,ts,jsx,tsx}',
		'./public/index.html',
		'../../atoms/dist/**/*.js',
		'../../ui/dist/**/*.js'
	],
	safelist: [
		{
			pattern: /^cursor-/
		},
		// {
		//   pattern: /^drag-/,
		// },
		'dragging',
		'drag-hover',
		'hover:cursor-grab',
		'hover:cursor-grabbing',
		'active:cursor-grabbing',
		'selected',
		'component-selected',
		'indicator'
	],

	prefix: '',
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				float: {
					'0%, 100%': { transform: 'translateY(0) scale(1)' },
					'50%': { transform: 'translateY(-20px) scale(1.05)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				float: 'float 8s ease-in-out infinite',
				'spin-slow': 'spin 20s linear infinite'
			},
			transitionTimingFunction: {
				'custom-ease': 'cubic-bezier(.36,.66,.6,1)'
			}
		}
	},
	plugins: [require('tailwindcss-animate')]
} satisfies Config;

export default config;
