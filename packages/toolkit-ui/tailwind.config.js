import { defineConfig } from 'tailwindcss';
import sharedConfig from '@ever-teams/tailwind-config';
import tailwindcssAnimate from 'tailwindcss-animate';

export default defineConfig({
	presets: [sharedConfig],
	darkMode: 'class',
	content: ['./src/lib/**/*.tsx'],

	theme: {
		extend: {
			colors: {
				transparent: 'transparent',
				current: 'currentColor',

				neutral: '#7E7991',
				chetwodeBlue: '#8C7AE4',
				indianRed: '#D95F5F',
				grey: '#868296',
				transparentWhite: 'rgba(255, 255, 255, 0.30)',
				primaryColor: '#3826A6',
				secondaryColor: '#A11DB1',

				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',

				primary: {
					DEFAULT: '#3826A6',
					light: '#6755C9',
					xlight: '#8E76FA',
					mid: '#483A95',
					foreground: 'hsl(var(--primary-foreground))'
				},
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
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},

	plugins: {
		tailwindcssAnimate
	}
});
