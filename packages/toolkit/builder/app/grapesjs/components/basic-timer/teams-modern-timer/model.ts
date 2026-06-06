import { ComponentDefinition } from '../../../types';
import { modernTimerConfig } from './config';
import { GrapesModel } from '../../../types';

export const modernTimerModel: ComponentDefinition['model'] = {
	defaults: {
		...modernTimerConfig.defaults,
		attributes: {
			...modernTimerConfig.defaults.attributes,
			'data-expandable': 'true',
			'data-separator': ':',
			'data-show-progress': 'false',
			'data-variant': 'default',
			'data-size': 'default'
		}
	},
	init(this: GrapesModel) {
		if (!this.get('size')) this.set('size', 'default');

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-expandable': String(this.get('expandable') ?? true),
				'data-separator': this.get('separator') || ':',
				'data-show-progress': String(this.get('showProgress') || false),
				'data-variant': this.get('variant') || 'default',
				'data-size': this.get('size') || 'default',
				'data-readonly': String(this.get('readonly') || false)
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

		['readonly', 'separator', 'expandable', 'showProgress', 'variant', 'size'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
