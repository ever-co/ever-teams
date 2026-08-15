import { ComponentDefinition } from '../../types';
import { progressCircleConfig } from './config';
import { GrapesModel } from '../../types';

export const progressCircleModel: ComponentDefinition['model'] = {
	defaults: {
		...progressCircleConfig.defaults,
		attributes: {
			...progressCircleConfig.defaults.attributes,
			'data-size': 'default',
			'data-color': 'primary',
			'data-progress': '0',
			'data-show-value': 'true'
		}
	},
	init(this: GrapesModel) {
		const updateView = () => {
			const view = this.getView();
			if (view) {
				view.onRender({ el: view.el, model: this });
			}
		};

		['size', 'color', 'progress', 'showValue'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
