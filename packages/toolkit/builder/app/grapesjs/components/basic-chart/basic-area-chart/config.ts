import { ComponentConfig } from '../../../types';

export const areaChartConfig: ComponentConfig = {
	type: 'basic-areachart',
	label: 'Area Chart',
	category: 'Chart',
	content: '<div data-gjs-type="basic-areachart"></div>',
	image: '/img/area_chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsChart',
			'data-type': 'area',
			style: 'min-height: 300px; width: 100%;'
		},
		draggable: '*',
		droppable: true,
		traits: []
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'TeamsChart',
		category: 'CHART',
		inputs: {
			name: 'InputTeamsChart',
			importPath: '@ever-teams/atoms'
		}
	}
};
