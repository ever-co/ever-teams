import { ComponentConfig } from '../../../types';

export const lineChartConfig: ComponentConfig = {
	type: 'basic-linechart',
	label: 'Line Chart',
	category: 'Chart',
	content: '<div data-gjs-type="basic-linechart"></div>',
	image: '/img/line_chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsChart',
			'data-type': 'line',
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
