// @ts-nocheck
// Custom single-component checkbox config for GrapesJS

export const checkboxConfig = {
	id: 'basic-checkbox',
	label: 'Checkbox',
	category: 'Form',
	content: {
		type: 'basic-checkbox'
	},
	traits: [
		{
			type: 'checkbox',
			name: 'checked',
			label: 'Checked',
			changeProp: 1
		},
		{
			type: 'text',
			name: 'label',
			label: 'Label',
			placeholder: 'Enter checkbox label',
			changeProp: 1
		},
		{
			type: 'select',
			name: 'size',
			label: 'Size',
			options: [
				{ value: 'small', name: 'Small' },
				{ value: 'medium', name: 'Medium' },
				{ value: 'large', name: 'Large' }
			],
			changeProp: 1
		}
	],
	style: {
		display: 'inline-block',
		width: 'fit-content',
		'max-width': '300px',
		'align-items': 'center',
		gap: '8px',
		margin: '5px',
		padding: '5px',
		cursor: 'pointer',
		'user-select': 'none',
		'min-width': 'auto'
	},
	styleAdditional: `
		.form-checkbox {
			display: flex;
			align-items: center;
			width: fit-content;
			max-width: 300px;
			vertical-align: middle;
			gap: 8px;
			min-width: auto;
		}
		.form-checkbox .checkbox-label {
			margin: 0;
			cursor: pointer;
			white-space: nowrap;
			font-size: 1rem;
			font-weight: 500;
			color: #222;
		}
		.form-checkbox .custom-checkbox {
			position: relative;
			display: inline-block;
			width: 22px;
			height: 22px;
			vertical-align: middle;
		}
		.form-checkbox input[type="checkbox"] {
			opacity: 0;
			width: 22px;
			height: 22px;
			margin: 0;
			position: absolute;
			left: 0;
			top: 0;
			z-index: 2;
			cursor: pointer;
		}
		.form-checkbox .checkmark {
			position: absolute;
			left: 0;
			top: 0;
			width: 22px;
			height: 22px;
			background: #fff;
			border: 2px solid #1976d2;
			border-radius: 6px;
			transition: background 0.2s, border-color 0.2s;
			box-shadow: 0 1px 2px rgba(25, 118, 210, 0.08);
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.form-checkbox input[type="checkbox"]:checked ~ .checkmark {
			background: #1976d2;
			border-color: #1976d2;
		}
		.form-checkbox .checkmark:after {
			content: '';
			display: none;
			width: 6px;
			height: 12px;
			border: solid #fff;
			border-width: 0 3px 3px 0;
			border-radius: 1px;
			transform: rotate(45deg);
			position: absolute;
			left: 7px;
			top: 2px;
		}
		.form-checkbox input[type="checkbox"]:checked ~ .checkmark:after {
			display: block;
		}
		.form-checkbox[data-size="small"] .custom-checkbox,
		.form-checkbox[data-size="small"] .checkmark,
		.form-checkbox[data-size="small"] input[type="checkbox"] {
			width: 16px;
			height: 16px;
		}
		.form-checkbox[data-size="large"] .custom-checkbox,
		.form-checkbox[data-size="large"] .checkmark,
		.form-checkbox[data-size="large"] input[type="checkbox"] {
			width: 28px;
			height: 28px;
		}
		.form-checkbox[data-size="small"] .checkmark:after {
			left: 4px;
			top: 1px;
			width: 4px;
			height: 8px;
			border-width: 0 2px 2px 0;
		}
		.form-checkbox[data-size="large"] .checkmark:after {
			left: 10px;
			top: 3px;
			width: 8px;
			height: 16px;
			border-width: 0 4px 4px 0;
		}
	`
};
