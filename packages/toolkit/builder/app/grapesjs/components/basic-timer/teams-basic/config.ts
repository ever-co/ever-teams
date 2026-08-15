import { ComponentConfig } from '../../../types';

export const teamsBasicConfig: ComponentConfig = {
	type: 'teams-essential-timer',
	label: 'Essential Timer',
	category: 'Timer',
	content: '<div data-gjs-type="teams-essential-timer"></div>',
	image: '/img/timer-smal.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsEssentialTimer',
			'data-progress': 'false',
			'data-background': 'primary',
			'data-rounded': 'large',
			'data-color': 'secondary',
			'data-icon': 'false',
			'data-border': 'thick',
			'data-readonly': 'false',
			style: 'width: 100%;'
		},
		draggable: '*',
		droppable: true,
		traits: [
			{
				type: 'checkbox',
				label: 'Progress',
				name: 'progress',
				changeProp: 1,
				default: false
			},
			{
				type: 'select',
				label: 'Background',
				name: 'background',
				changeProp: 1,
				default: 'primary',
				options: [
					{ value: 'primary', name: 'Primary' },
					{ value: 'secondary', name: 'Secondary' },
					{ value: 'destructive', name: 'Destructive' }
				]
			},
			{
				type: 'select',
				label: 'Rounded',
				name: 'rounded',
				changeProp: 1,
				default: 'large',
				options: [
					{ value: 'none', name: 'None' },
					{ value: 'small', name: 'Small' },
					{ value: 'medium', name: 'Medium' },
					{ value: 'large', name: 'Large' }
				]
			},
			{
				type: 'select',
				label: 'Color',
				name: 'color',
				changeProp: 1,
				default: 'secondary',
				options: [
					{ value: 'primary', name: 'Primary' },
					{ value: 'secondary', name: 'Secondary' },
					{ value: 'destructive', name: 'Destructive' }
				]
			},
			{
				type: 'checkbox',
				label: 'Show Icon',
				name: 'icon',
				changeProp: 1,
				default: false
			},
			{
				type: 'select',
				label: 'Border',
				name: 'border',
				changeProp: 1,
				default: 'thick',
				options: [
					{ value: 'none', name: 'None' },
					{ value: 'thick', name: 'Thick' },
					{ value: 'thin', name: 'Thin' }
				]
			},
			{
				type: 'checkbox',
				label: 'Read Only',
				name: 'readonly',
				changeProp: 1,
				default: false
			}
		]
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'TeamsBasic',
		category: 'TIMER',
		inputs: {
			name: 'InputTeamsBasic',
			importPath: '@ever-teams/atoms'
		}
	}
};
