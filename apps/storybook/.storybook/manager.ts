import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
import logo from '../public/ever-teams-logo.svg';

const customTheme = create({
	base: 'dark',

	// Branding
	brandTitle: 'Ever Teams',
	brandUrl: '/',
	brandImage: logo,
	brandTarget: '_self', // optional

	// Primary / accent colors (from ever.team style)
	colorPrimary: '#8b5cf6', // purple / violet accent
	colorSecondary: '#9333ea', // slightly darker purple for hover / alternate accents

	// UI background colors
	appBg: '#121212',
	appContentBg: '#1e1e1e',
	appBorderColor: '#333333',
	appBorderRadius: 4,

	// Text colors
	textColor: '#e5e7eb', // near-white for visibility on dark background
	textInverseColor: '#1e1e1e',

	// Toolbar
	barTextColor: '#d1d5db',
	barSelectedColor: '#8b5cf6',
	barBg: '#1f1f1f',

	// Form / input colors
	inputBg: '#2a2a2a',
	inputBorder: '#444444',
	inputTextColor: '#e5e7eb',
	inputBorderRadius: 3
});

addons.setConfig({
	theme: customTheme
});
