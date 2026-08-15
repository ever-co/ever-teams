import { ComponentDefinition } from '../../../types';
import { radarChartConfig } from './config';
import { GrapesModel } from '../../../types';

export const radarChartModel: ComponentDefinition['model'] = {
	defaults: {
		...radarChartConfig.defaults,
		attributes: {
			...radarChartConfig.defaults.attributes,
			'data-type': 'radar'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-type': 'radar'
			};

			this.set('attributes', {
				...this.get('attributes'),
				...attributes
			});

			// Update view
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
