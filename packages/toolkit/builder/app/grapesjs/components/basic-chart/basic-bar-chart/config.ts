import { ComponentConfig } from '../../../types';

export const barChartConfig: ComponentConfig = {
	type: 'basic-barchart',
	label: 'Bar Chart',
	category: 'Chart',
	content: '<div data-gjs-type="basic-barchart"></div>',
	image: '/img/bar_chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsChart',
			'data-type': 'bar',
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
