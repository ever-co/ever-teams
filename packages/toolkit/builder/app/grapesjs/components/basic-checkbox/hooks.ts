// @ts-nocheck
import { checkboxConfig } from './config';

export const useCheckbox = ({ editor }: { editor: any }) => {
	if (!editor) return;

	editor.DomComponents.addType('basic-checkbox', {
		model: {
			defaults: {
				tagName: 'div',
				attributes: { class: 'form-checkbox', 'data-size': 'medium' },
				traits: checkboxConfig.traits,
				styles: checkboxConfig.style,
				components: [],
				checked: false,
				label: 'Checkbox',
				size: 'medium'
			},
			init() {
				this.listenTo(this, 'change:label change:checked change:size', () => this.view?.render());
			}
		},
		view: {
			onRender() {
				this.renderCheckbox();
			},
			renderCheckbox() {
				this.el.innerHTML = '';
				const model = this.model;
				const checked = !!model.get('checked');
				const label = model.get('label') || 'Checkbox';
				const size = model.get('size') || 'medium';

				this.el.setAttribute('data-size', size);

				const customLabel = document.createElement('label');
				customLabel.className = 'custom-checkbox';

				const input = document.createElement('input');
				input.type = 'checkbox';
				input.checked = checked;
				input.setAttribute('data-size', size);
				input.addEventListener('change', (e) => {
					model.set('checked', e.target.checked);
				});

				const checkmark = document.createElement('span');
				checkmark.className = 'checkmark';

				customLabel.appendChild(input);
				customLabel.appendChild(checkmark);

				const labelEl = document.createElement('span');
				labelEl.className = 'checkbox-label';
				labelEl.textContent = label;
				labelEl.style.marginLeft = '8px';

				this.el.appendChild(customLabel);
				this.el.appendChild(labelEl);
			},
			updateCheckbox() {
				const input = this.el.querySelector('input[type="checkbox"]');
				if (input) input.checked = !!this.model.get('checked');
			},
			updateLabel() {
				const labelEl = this.el.querySelector('label.checkbox-label');
				if (labelEl) labelEl.textContent = this.model.get('label') || 'Checkbox';
			},
			updateSize() {
				const input = this.el.querySelector('input[type="checkbox"]');
				const size = this.model.get('size') || 'medium';
				if (input) input.setAttribute('data-size', size);
			}
		}
	});

	// Add additional styles
	if (checkboxConfig.styleAdditional) {
		editor.Css.addRules(checkboxConfig.styleAdditional);
	}
};
