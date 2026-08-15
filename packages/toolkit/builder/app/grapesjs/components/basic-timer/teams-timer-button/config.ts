import { ComponentTrait, ComponentConfig } from '../../../types';

const traits: ComponentTrait[] = [
	{
		type: 'select',
		label: 'Size',
		name: 'size',
		changeProp: 1,
		default: 'default',
		options: [
			{ value: 'default', name: 'Default' },
			{ value: 'sm', name: 'Small' },
			{ value: 'lg', name: 'Large' }
		]
	},
	{
		type: 'select',
		label: 'Variant',
		name: 'variant',
		changeProp: 1,
		default: 'default',
		options: [
			{ value: 'default', name: 'Default' },
			{ value: 'bordered', name: 'Bordered' }
		]
	}
];

export const teamsTimerButtonConfig: ComponentConfig = {
	type: 'data-timer-button',
	label: 'Timer Button',
	category: 'Timer',
	content: '<div data-gjs-type="data-timer-button"></div>',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsTimerButton',
			'data-size': 'default',
			'data-variant': 'default'
		},
		draggable: '*',
		droppable: true,
		traits
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'TeamsButton',
		category: 'TIMER',
		inputs: {
			name: 'InputTeamsTimerButton',
			importPath: '@ever-teams/atoms'
		}
	}
};
