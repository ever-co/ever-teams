import { ComponentConfig } from '../../../types';

export const radarChartConfig: ComponentConfig = {
	type: 'basic-radarchart',
	label: 'Radar Chart',
	category: 'Charts',
	content: '<div data-gjs-type="basic-radarchart"></div>',
	image: '/img/chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'BasicRadarChart',
			style: 'min-height: 300px; width: 100%;'
		},
		draggable: '*',
		droppable: true,
		traits: []
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'BasicRadarChart',
		category: 'CHART',
		inputs: {
			name: 'InputBasicRadarChart',
			importPath: '@ever-teams/atoms'
		}
	}
};
