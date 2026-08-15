import { ComponentConfig } from '../../../types';

export const radialChartConfig: ComponentConfig = {
	type: 'basic-radialchart',
	label: 'Radial Chart',
	category: 'Chart',
	content: '<div data-gjs-type="basic-radialchart"></div>',
	image: '/img/chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'BasicRadialChart',
			style: 'min-height: 300px; width: 100%;'
		},
		draggable: '*',
		droppable: true,
		traits: []
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'BasicRadialChart',
		category: 'CHART',
		inputs: {
			name: 'InputBasicRadialChart',
			importPath: '@ever-teams/atoms'
		}
	}
};
