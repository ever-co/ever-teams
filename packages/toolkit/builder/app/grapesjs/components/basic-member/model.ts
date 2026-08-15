import { ComponentDefinition } from '../../types';
import { basicMemberConfig, DEFAULT_MEMBERS } from './config';
import { GrapesModel } from '../../types';

export const memberModel: ComponentDefinition['model'] = {
	defaults: {
		...basicMemberConfig.defaults,
		attributes: {
			...basicMemberConfig.defaults.attributes,
			'data-variant': 'default',
			'data-size': 'default',
			'data-show-progress': 'false',
			'data-show-time': 'false',
			'data-title': 'Members Activities',
			'data-values': JSON.stringify(DEFAULT_MEMBERS)
		}
	},
	init(this: GrapesModel) {
		if (!this.get('size')) this.set('size', 'default');
		if (!this.get('variant')) this.set('variant', 'default');
		if (!this.get('title')) this.set('title', 'Members Activities');
		if (!this.get('values')) {
			this.set('values', JSON.stringify(DEFAULT_MEMBERS));
		}

		const updateView = () => {
			// Update attributes
			const attributes = {
				'data-variant': this.get('variant') || 'default',
				'data-size': this.get('size') || 'default',
				'data-show-progress': String(this.get('showProgress') || false),
				'data-show-time': String(this.get('showTime') || false),
				'data-title': this.get('title') || 'Members Activities',
				'data-values': this.get('values') || JSON.stringify(DEFAULT_MEMBERS)
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

		['size', 'variant', 'showProgress', 'showTime', 'title', 'values'].forEach((prop) => {
			this.on(`change:${prop}`, updateView);
		});
	},
	handleChanges() {}
};
