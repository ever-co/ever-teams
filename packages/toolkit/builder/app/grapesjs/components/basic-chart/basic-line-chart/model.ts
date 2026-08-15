import { ComponentDefinition } from '../../../types';
import { lineChartConfig } from './config';
import { GrapesModel } from '../../../types';

export const lineChartModel: ComponentDefinition['model'] = {
	defaults: {
		...lineChartConfig.defaults,
		attributes: {
			...lineChartConfig.defaults.attributes,
			'data-type': 'line'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			const attributes = {
				'data-type': 'line'
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
