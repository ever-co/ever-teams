/**
 * Media component configurations
 */
import { ConfigItem } from '../../../types';
import { divider, margin, sliderOpacity, textAlign } from './common';

// Define config array
const imageConfig: ConfigItem[] = [
	{
		type: 'image',
		property: 'src',
		label: 'Upload Image',
		sizeLimit: 5 * 1024 * 1024, // 5MB
		validFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/jpg']
	},
	divider,
	{
		type: 'number',
		property: 'width',
		label: 'Width',
		options: {
			min: 0,
			max: 1000
		}
	},
	{
		type: 'number',
		property: 'height',
		label: 'Height',
		options: {
			min: 0,
			max: 1000
		}
	},
	divider,
	margin,
	divider,
	textAlign,
	{
		type: 'select',
		property: 'objectFit',
		label: 'Object Fit',
		list: [
			{ label: 'Fill', value: 'fill' },
			{ label: 'Contain', value: 'contain' },
			{ label: 'Cover', value: 'cover' },
			{ label: 'None', value: 'none' },
			{ label: 'Scale Down', value: 'scale-down' }
		]
	},
	sliderOpacity,
	margin
];

// Export named config
export { imageConfig as imageEditbarConfig };
