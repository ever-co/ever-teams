/** @type {import('tailwindcss').Config} */

import defaultTheme from 'tailwindcss/defaultTheme';
module.exports = {
	darkMode: ['class'],
	content: [
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./core/**/*.{js,ts,jsx,tsx,mdx}',
		'./lib/**/*.{js,ts,jsx,tsx,mdx}',
		'./utils/**/*.{js,ts,jsx,tsx,mdx}',
		'./hooks/**/*.{js,ts,jsx,tsx,mdx}',
		'./icons/**/*.{js,ts,jsx,tsx,mdx}',
		'./assets/**/*.{js,ts,jsx,tsx,mdx}'
	],

	corePlugins: {
		fontSmoothing: true
	},
	theme: {
		screens: {
			...defaultTheme.screens,
			xss: '375px',
			xs: '414px',
			sm: '576px',
			md: '768px',
			lg: '1024px',
			xl: '1280px',
			'2xl': '1400px',
			'3xl': '1540px',
			'4xl': '1680px',
			'5xl': '1820px',
			'6xl': '1960px',
			'7xl': '2100px'
		},
		container: {
			center: 'true',
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontSize: {
				xs: ['12px', '18px'],
				sm: ['14px', '20px'],
				base: ['16px', '24px'],
				lg: ['18px', '28px'],
				xl: ['20px', '30px'],
				'2xl': ['24px', '32px'],
				'3xl': ['30px', '36px'],
				'4xl': ['36px', '40px'],
				'5xl': ['48px', '1']
			},
			lineHeight: {
				tight: '1.2',
				normal: '1.5',
				relaxed: '1.625'
			},
			letterSpacing: {
				tight: '-0.015em',
				normal: '0em',
				wide: '0.015em'
			},
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
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
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
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				spine: 'spin 10s linear infinite'
			},
			typography: {
				DEFAULT: {
					css: {
						maxWidth: '100ch',
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
						'h1 span': {
							fontSize: '1.3rem'
						},
						'h2 span': {
							fontSize: '1.1rem',
							fontWeight: 'bold'
						},
						'strong span': {
							fontWeight: '600'
						}
					}
				}
			}
		}
	},
	plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
};
