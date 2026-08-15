import { ComponentConfig, ComponentTrait } from '../../types';

const traits: ComponentTrait[] = [
	{
		type: 'checkbox',
		label: 'Show Outside Days',
		name: 'showOutsideDays',
		changeProp: 1,
		default: true
	}
];

export const basicCalendarConfig: ComponentConfig = {
	type: 'basic-calendar',
	label: 'Basic Calendar',
	category: 'Date',
	content: '<div data-gjs-type="basic-calendar"></div>',
	image: '/img/calendar.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'Calendar',
			'data-readonly': 'false',
			'data-variant': 'default',
			'data-size': 'default'
		},
		draggable: '*',
		droppable: false,
		traits
	},
	mapping: {
		importPath: '@ever-teams/toolkit-ui',
		componentName: 'Calendar',
		category: 'DATE',
		inputs: {
			name: 'Calendar',
			importPath: '@ever-teams/toolkit-ui'
		}
	}
};
