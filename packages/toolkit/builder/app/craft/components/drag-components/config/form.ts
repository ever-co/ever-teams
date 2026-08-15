/**
 * Form component configurations
 */
import { ConfigItem } from '../../../types';
import { backgroundColorInput, colorInput, divider, margin, padding, sliderOpacity, textAlign } from './common';

// Define config arrays
const inputConfig: ConfigItem[] = [
	{
		label: 'Placeholder',
		type: 'text',
		property: 'placeholder'
	},
	{
		type: 'number',
		property: 'fontSize',
		label: 'Font Size',
		options: {
			max: 100,
			min: 0
		}
	},
	divider,
	{
		type: 'switch',
		label: 'Show Label',
		property: 'showLabel'
	},
	{
		type: 'text',
		label: 'Label Text',
		property: 'label'
	},
	{
		type: 'select',
		label: 'Label Position',
		property: 'labelPosition',
		list: [
			{ label: 'Top', value: 'top' },
			{ label: 'Left', value: 'left' },
			{ label: 'Right', value: 'right' }
		]
	},
	{
		type: 'number',
		property: 'labelSize',
		label: 'Label Size',
		options: {
			min: 10,
			max: 24
		}
	},
	{
		type: 'color',
		property: 'labelColor',
		label: 'Label Color'
	},
	{
		type: 'select',
		label: 'Label Weight',
		property: 'labelWeight',
		list: [
			{ label: 'Normal', value: '400' },
			{ label: 'Medium', value: '500' },
			{ label: 'Bold', value: '700' }
		]
	},
	{
		type: 'switch',
		label: 'Required',
		property: 'required'
	},
	divider,
	{
		label: 'Input Type',
		property: 'inputType',
		type: 'select',
		list: [
			{ label: 'Email', value: 'email' },
			{ label: 'Text', value: 'text' },
			{ label: 'Number', value: 'number' },
			{ label: 'Tel', value: 'tel' },
			{ label: 'URL', value: 'url' },
			{ label: 'Password', value: 'password' }
		]
	},
	divider,
	colorInput,
	backgroundColorInput,
	{
		type: 'number',
		property: 'borderRadius',
		label: 'Border Radius',
		options: {
			min: 0,
			max: 20
		}
	},
	{
		type: 'color',
		property: 'borderColor',
		label: 'Border Color'
	},
	{
		type: 'number',
		property: 'borderWidth',
		label: 'Border Width',
		options: {
			min: 0,
			max: 10
		}
	},
	{
		type: 'switch',
		property: 'shadow',
		label: 'Shadow'
	},
	textAlign,
	sliderOpacity,
	divider,
	margin,
	padding
];

const selectDropdownConfig: ConfigItem[] = [
	{
		type: 'text',
		label: 'Label',
		property: 'label'
	},
	textAlign,
	colorInput,
	sliderOpacity,
	divider,
	{
		type: 'number',
		property: 'borderRadius',
		label: 'Border Radius',
		options: {
			min: 0,
			max: 20
		}
	},
	{
		type: 'color',
		property: 'borderColor',
		label: 'Border Color'
	},
	{
		type: 'number',
		property: 'borderWidth',
		label: 'Border Width',
		options: {
			min: 0,
			max: 10
		}
	},
	{
		type: 'switch',
		property: 'shadow',
		label: 'Shadow'
	},
	divider,
	margin,
	padding,
	divider,
	backgroundColorInput,
	{
		type: 'fieldArray',
		property: 'list',
		label: 'Options',
		list: [
			{
				label: 'Option 1',
				value: 'option1'
			}
		]
	},
	{
		type: 'image',
		property: 'icon',
		label: 'Icon',
		sizeLimit: 5 * 1024 * 1024, // 5MB
		validFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/jpg']
	}
];

const checkboxConfig: ConfigItem[] = [
	{
		type: 'switch',
		property: 'checked',
		label: 'Checked'
	},
	divider,
	{
		type: 'text',
		property: 'title',
		label: 'Content'
	},
	textAlign,
	divider,
	margin,
	padding,
	divider,
	{
		type: 'switch',
		property: 'hideDescription',
		label: 'Hide Description'
	},
	{
		type: 'textarea',
		property: 'description',
		label: 'Description'
	},
	margin
];

const calendarConfig: ConfigItem[] = [
	{
		type: 'text',
		label: 'ClassName',
		property: 'className'
	},
	{
		type: 'switch',
		label: 'Show Outside Days',
		property: 'showOutsideDays'
	}
];

// Export named configs
export {
	inputConfig as inputEditbarConfig,
	selectDropdownConfig as selectDropdownEditbarConfig,
	checkboxConfig as checkboxEditbarConfig,
	calendarConfig as calendarEditbarConfig
};
