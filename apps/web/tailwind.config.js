const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');
/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
		join(__dirname, '{src,pages,components,lib}/**/*!(*.stories|*.spec).{ts,tsx,html}'),
		...createGlobPatternsForDependencies(__dirname)
	],
	theme: {
		screens: {
			xs: '414px',
			sm: '576px',
			md: '768px',
			lg: '992px',
			xl: '1200px',
			'2xl': '1400px',
			'3xl': '1600px'
		},
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				transparent: 'transparent',
				current: 'currentColor',
				neutral: '#7E7991',
				chetwodeBlue: '#8C7AE4',
				indianRed: '#D95F5F',
				grey: '#868296',
				transparentWhite: 'rgba(255, 255, 255, 0.30)',
				default: {
					DEFAULT: '#282048'
				},
				'light--theme': {
					light: '#fff',
					DEFAULT: '#f7f7f8',
					dark: '#E7E7EA'
				},
				'dark--theme': {
					light: '#1E2025',
					DEFAULT: 'var(--tw-color-dark--theme)'
				},
				primary: {
					DEFAULT: '#3826A6',
					light: '#6755C9',
					xlight: '#8E76FA',
					mid: '#483A95',

					foreground: 'hsl(var(--primary-foreground))'
				},
				dark: {
					high: '#16171B',
					lighter: '#1E2430',
					DEFAULT: '#1A1C1E'
				},

				'regal-blue': '#6A71E7',
				'regal-rose': '#E93CB9',

				border: 'hsl(var(--border))',
				// input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',

				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				}
			},
			fontFamily: {
				PlusJakartaSans: ['Plus-Jakarta-Sans-VariableFont_wght'],
				PlusJakartaSansRegular: ['Plus-Jakarta-Sans-Regular'],
				PlusJakartaSansBold: ['Plus-Jakarta-Sans-Bold'],
				PlusJakartaSansLight: ['Plus-Jakarta-Sans-Light'],
				PlusJakartaSansMedium: ['Plus-Jakarta-Sans-Medium'],
				PlusJakartaSansSemiBold: ['Plus-Jakarta-Sans-SemiBold']
			},
			boxShadow: {
				lgcard: '0px 50px 200px rgba(0, 0, 0, 0.1)',
				xlcard: '0px 16px 79px rgba(0, 0, 0, 0.12)',
				'lgcard-white': '0px 50px 200px rgba(255, 255, 255, 0.1)',
				'xlcard-white': '0px 16px 79px rgba(255, 255, 255, 0.12)',
				darker: '-8px -9px 14px rgba(255, 255, 255, 0.05), 10px 14px 34px rgba(0, 0, 0, 0.6), 0px 4px 24px rgba(0, 0, 0, 0.25)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			typography: {
				DEFAULT: {
					css: {
						maxWidth: '100ch',
						// Add margin top and bottom for all HTML tags if needed

						'h3, h4, h5, h6, p, span, em, ul, ol, dl, blockquote, code, figure, pre': {
							marginTop: '0.5rem',
							marginBottom: '0.5rem',
							lineHeight: '1.25rem',
							fontSize: '14px',
							wordSpacing: '-1px',
							fontWeight: '400'
						},
						h1: {
							fontSize: '1.3rem',
							marginTop: '0.65rem',
							marginBottom: '0.65rem',
							lineHeight: '40px'
						},
						h2: {
							fontSize: '1.1rem',
							marginTop: '0.35rem',
							marginBottom: '0.35rem',
							lineHeight: '30px'
						},
						'h1 span': { fontSize: '1.3rem' },
						'h2 span': { fontSize: '1.1rem', fontWeight: 'bold' },
						'strong span': { fontWeight: '600' }
					}
				}
			}
		}
	},
	plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
};
