import { ComponentDefinition } from '../../../types';
import { tooltipChartConfig } from './config';
import { GrapesModel } from '../../../types';

export const tooltipChartModel: ComponentDefinition['model'] = {
	defaults: {
		...tooltipChartConfig.defaults,
		attributes: {
			...tooltipChartConfig.defaults.attributes,
			'data-type': 'tooltip'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			const attributes = {
				'data-type': 'tooltip'
			};

			this.set('attributes', {
				...this.get('attributes'),
				...attributes
			});

			const view = this.getView();
			if (view) {
				view.onRender({ el: view.el, model: this });
			}
		};

		['data'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
