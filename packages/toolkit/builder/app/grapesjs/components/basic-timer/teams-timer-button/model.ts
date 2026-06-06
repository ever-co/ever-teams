import { ComponentDefinition } from '../../../types';
import { teamsTimerButtonConfig } from './config';
import { GrapesModel } from '../../../types';

export const teamsTimerButtonModel: ComponentDefinition['model'] = {
	defaults: {
		...teamsTimerButtonConfig.defaults,
		attributes: {
			...teamsTimerButtonConfig.defaults.attributes,
			'data-component': 'TeamsTimerButton',
			'data-size': 'default',
			'data-variant': 'default'
		}
	},
	init(this: GrapesModel) {
		if (!this.get('size')) this.set('size', 'default');
		if (!this.get('variant')) this.set('variant', 'default');

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-component': 'TeamsTimerButton',
				'data-size': this.get('size') || 'default',
				'data-variant': this.get('variant') || 'default'
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

		['size', 'variant'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
