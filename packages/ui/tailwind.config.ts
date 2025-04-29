import type { Config } from "tailwindcss";

import defaultTheme from "tailwindcss/defaultTheme";

const { default: flattenColorPalette } = require("tailwindcss/lib/util/flattenColorPalette");

const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '18px',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		fontFamily: {
    			sans: [
    				'var(--font-geist-sans)'
    			]
    		},
    		backgroundImage: {
    			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
    			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
    			'main-gradient': 'linear-gradient(127deg, #3826A6 9.29%, #A11DB1 79.28%)',
    			'white-gradient': 'linear-gradient(90deg, #FFF 0%, rgba(255, 255, 255, 0.80) 50%, rgba(255, 255, 255, 0.30) 100%)',
    			'black-linear': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.00) 100%)',
    			'cover-blur': 'linear-gradient(180deg, rgba(36, 22, 49, 0.00) 0%, #0B0710 95%)'
    		},
    		boxShadow: {
    			'black-default': '0px -5px 10px 0px rgba(233, 223, 255, 0.30), 0px -2px 40px 0px rgba(187, 155, 255, 0.15)',
    			'cover-img': '0px -2px 10px 0px rgba(233, 223, 255, 0.30), 0px -2px 40px 0px rgba(187, 155, 255, 0.15), 0px 0.5px 0px 0px rgba(255, 255, 255, 0.50) inset'
    		},
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
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
    			},
    			'color-1': 'hsl(var(--color-1))',
    			'color-2': 'hsl(var(--color-2))',
    			'color-3': 'hsl(var(--color-3))',
    			'color-4': 'hsl(var(--color-4))',
    			'color-5': 'hsl(var(--color-5))',
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
    		borderWidth: {
    			DEFAULT: '1px',
    			'0': '0',
    			'2': '2px',
    			'2.5': '2.5px',
    			'3': '3px',
    			'4': '4px',
    			'5': '5px',
    			'6': '6px',
    			'7': '7px',
    			'8': '8px'
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'fade-in-down': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateY(-10px)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				}
    			},
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
    			},
    			'border-beam': {
    				'100%': {
    					'offset-distance': '100%'
    				}
    			},
    			'shine-pulse': {
    				'0%': {
    					'background-position': '0% 0%'
    				},
    				'50%': {
    					'background-position': '100% 100%'
    				},
    				to: {
    					'background-position': '0% 0%'
    				}
    			},
    			'background-position-spin': {
    				'0%': {
    					backgroundPosition: 'top center'
    				},
    				'100%': {
    					backgroundPosition: 'bottom center'
    				}
    			},
    			shimmer: {
    				'0%, 90%, 100%': {
    					'background-position': 'calc(-100% - var(--shimmer-width)) 0'
    				},
    				'30%, 60%': {
    					'background-position': 'calc(100% + var(--shimmer-width)) 0'
    				}
    			},
    			gradient: {
    				to: {
    					backgroundPosition: 'var(--bg-size) 0'
    				}
    			},
    			pulseScale: {
    				'0%, 100%': {
    					transform: 'scale(1)',
    					opacity: '0.5'
    				},
    				'50%': {
    					transform: 'scale(1.1)',
    					opacity: '1'
    				}
    			},
    			'spin-around': {
    				'0%': {
    					transform: 'translateZ(0) rotate(0)'
    				},
    				'15%, 35%': {
    					transform: 'translateZ(0) rotate(90deg)'
    				},
    				'65%, 85%': {
    					transform: 'translateZ(0) rotate(270deg)'
    				},
    				'100%': {
    					transform: 'translateZ(0) rotate(360deg)'
    				}
    			},
    			'shimmer-slide': {
    				to: {
    					transform: 'translate(calc(100cqw - 100%), 0)'
    				}
    			},
    			marquee: {
    				from: {
    					transform: 'translateX(0)'
    				},
    				to: {
    					transform: 'translateX(calc(-100% - var(--gap)))'
    				}
    			},
    			'marquee-vertical': {
    				from: {
    					transform: 'translateY(0)'
    				},
    				to: {
    					transform: 'translateY(calc(-100% - var(--gap)))'
    				}
    			},
    			grid: {
    				'0%': {
    					transform: 'translateY(-50%)'
    				},
    				'100%': {
    					transform: 'translateY(0)'
    				}
    			},
    			orbit: {
    				'0%': {
    					transform: 'rotate(calc(var(--angle) * 1deg)) translateY(calc(var(--radius) * 1px)) rotate(calc(var(--angle) * -1deg))'
    				},
    				'100%': {
    					transform: 'rotate(calc(var(--angle) * 1deg + 360deg)) translateY(calc(var(--radius) * 1px)) rotate(calc((var(--angle) * -1deg) - 360deg))'
    				}
    			},
    			'aurora-border': {
    				'0%, 100%': {
    					borderRadius: '37% 29% 27% 27% / 28% 25% 41% 37%'
    				},
    				'25%': {
    					borderRadius: '47% 29% 39% 49% / 61% 19% 66% 26%'
    				},
    				'50%': {
    					borderRadius: '57% 23% 47% 72% / 63% 17% 66% 33%'
    				},
    				'75%': {
    					borderRadius: '28% 49% 29% 100% / 93% 20% 64% 25%'
    				}
    			},
    			'aurora-1': {
    				'0%, 100%': {
    					top: '0',
    					right: '0'
    				},
    				'50%': {
    					top: '50%',
    					right: '25%'
    				},
    				'75%': {
    					top: '25%',
    					right: '50%'
    				}
    			},
    			'aurora-2': {
    				'0%, 100%': {
    					top: '0',
    					left: '0'
    				},
    				'60%': {
    					top: '75%',
    					left: '25%'
    				},
    				'85%': {
    					top: '50%',
    					left: '50%'
    				}
    			},
    			'aurora-3': {
    				'0%, 100%': {
    					bottom: '0',
    					left: '0'
    				},
    				'40%': {
    					bottom: '50%',
    					left: '25%'
    				},
    				'65%': {
    					bottom: '25%',
    					left: '50%'
    				}
    			},
    			'aurora-4': {
    				'0%, 100%': {
    					bottom: '0',
    					right: '0'
    				},
    				'50%': {
    					bottom: '25%',
    					right: '40%'
    				},
    				'90%': {
    					bottom: '50%',
    					right: '25%'
    				}
    			},
    			meteor: {
    				'0%': {
    					transform: 'rotate(215deg) translateX(0)',
    					opacity: '1'
    				},
    				'70%': {
    					opacity: '1'
    				},
    				'100%': {
    					transform: 'rotate(215deg) translateX(-500px)',
    					opacity: '0'
    				}
    			}
    		},
    		animation: {
    			meteor: 'meteor 5s linear infinite',
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'fade-in-down': 'fade-in-down 0.5s ease-out',
    			'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
    			shimmer: 'shimmer 8s infinite',
    			orbit: 'orbit calc(var(--duration)*1s) linear infinite',
    			gradient: 'gradient 8s linear infinite',
    			backgroundPositionSpin: 'background-position-spin 3000ms infinite alternate',
    			'pulse-scale': 'pulseScale 1.5s ease-in-out infinite alternate',
    			'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
    			'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
    			marquee: 'marquee var(--duration) linear infinite',
    			'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
    			grid: 'grid 25s linear infinite'
    		},
    		screens: {
                ...defaultTheme.screens,
    			xss: '320px',
    			xs: '375px',
    			sm: '425px'
    		}
    	}
    },
	plugins: [addVariablesForColors, require("tailwindcss-animate")],
} satisfies Config;
function addVariablesForColors({ addBase, theme }: any) {
	let allColors = flattenColorPalette(theme("colors"));
	let newVars = Object.fromEntries(Object.entries(allColors).map(([key, val]) => [`--${key}`, val]));

	addBase({
		":root": newVars,
	});
}
export default config;
