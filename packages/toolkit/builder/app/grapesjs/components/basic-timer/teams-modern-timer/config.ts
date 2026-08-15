import { ComponentConfig, ComponentTrait } from '../../../types';

const traits: ComponentTrait[] = [
	{
		type: 'select',
		label: 'Size',
		name: 'size',
		changeProp: 1,
		default: 'default',
		options: [
			{ value: 'default', name: 'Default' },
			{ value: 'sm', name: 'Small' }
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
	},
	{
		type: 'checkbox',
		label: 'Read Only',
		name: 'readonly',
		changeProp: 1,
		default: false
	},
	{
		type: 'text',
		label: 'Separator',
		name: 'separator',
		changeProp: 1,
		default: ':'
	},
	{
		type: 'checkbox',
		label: 'Expandable',
		name: 'expandable',
		changeProp: 1,
		default: true
	},
	{
		type: 'checkbox',
		label: 'Show Progress',
		name: 'showProgress',
		changeProp: 1,
		default: false
	}
];

export const modernTimerConfig: ComponentConfig = {
	type: 'basic-timer-modern',
	label: 'Modern Timer',
	category: 'Timer',
	content: '<div data-gjs-type="basic-timer-modern"></div>',
	image: '/img/timer.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-timer-modern': 'BasicModernTimer',
			'data-readonly': 'false',
			'data-variant': 'default'
		},
		draggable: '*',
		droppable: true,
		traits
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'TeamsModernTimer',
		category: 'TIMER',
		inputs: {
			name: 'InputModernCloc',
			importPath: '@ever-teams/atoms'
		}
	}
};
