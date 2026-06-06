import { ComponentConfig } from '../../../types';

export const barChartVerticalConfig: ComponentConfig = {
	type: 'basic-chart-vertical',
	label: 'Vertical Bar Chart',
	category: 'Chart',
	content: '<div data-gjs-type="basic-chart-vertical"></div>',
	image: '/img/chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsChart',
			'data-type': 'bar-horizontal',
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
