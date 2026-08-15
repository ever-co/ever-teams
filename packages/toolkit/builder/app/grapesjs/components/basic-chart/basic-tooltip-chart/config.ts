import { ComponentConfig } from '../../../types';

export const tooltipChartConfig: ComponentConfig = {
	type: 'basic-tooltipchart',
	label: 'Tooltip Chart',
	category: 'Chart',
	content: '<div data-gjs-type="basic-tooltipChart"></div>',
	image: '/img/chart.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'TeamsChart',
			'data-type': 'tooltip',
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
