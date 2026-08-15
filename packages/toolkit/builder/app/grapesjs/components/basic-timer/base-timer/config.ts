import { ComponentConfig, ComponentTrait } from '../../../types';

const traits: ComponentTrait[] = [
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
		type: 'select',
		label: 'Border',
		name: 'border',
		changeProp: 1,
		default: 'thick',
		options: [
			{ value: 'thick', name: 'Thick' },
			{ value: 'thin', name: 'Thin' },
			{ value: 'none', name: 'None' }
		]
	},
	{
		type: 'select',
		label: 'Rounded',
		name: 'rounded',
		changeProp: 1,
		default: 'large',
		options: [
			{ value: 'large', name: 'Large' },
			{ value: 'medium', name: 'Medium' },
			{ value: 'small', name: 'Small' },
			{ value: 'none', name: 'None' }
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
		type: 'checkbox',
		label: 'Read Only',
		name: 'readonly',
		changeProp: 1,
		default: false
	}
];

export const timerConfig: ComponentConfig = {
	type: 'basic-timer',
	label: 'Basic Timer',
	category: 'TIMER',
	content: '<div data-gjs-type="basic-timer"></div>',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsBasicTimer',
			'data-timer': 'TeamsBasicTimer',
			'data-border': 'thick',
			'data-background': 'primary',
			'data-color': 'secondary',
			'data-rounded': 'large',
			'data-readonly': 'false',
			'data-icon': 'false',
			style: 'width: 100%;'
		},
		draggable: '*',
		droppable: true,
		traits
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'TeamsBasicTimer',
		category: 'TIMER',
		inputs: {
			name: 'InputBaseTimer',
			importPath: '@ever-teams/atoms'
		}
	}
};
