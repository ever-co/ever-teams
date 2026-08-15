/**
 * Text component configurations
 */
import { ConfigItem } from '../../../types';
import {
	colorInput,
	divider,
	fontDecoration,
	fontWeight,
	margin,
	padding,
	sliderFontSize,
	sliderOpacity,
	textAlign,
	titleText
} from './common';

// Define config arrays
const titleConfig: ConfigItem[] = [
	titleText,
	fontWeight,
	colorInput,
	divider,
	margin,
	padding,
	divider,
	sliderFontSize,
	sliderOpacity,
	divider,
	fontDecoration,
	textAlign
];

const linkConfig: ConfigItem[] = [
	titleText,
	{
		type: 'text',
		property: 'href',
		label: 'Href'
	},
	{
		type: 'switch',
		label: 'Open in new tab',
		property: 'openInNewTab'
	},
	divider,
	margin,
	padding,
	divider,
	{
		type: 'color',
		label: 'Text Color',
		property: 'color'
	},
	{
		type: 'color',
		label: 'Hover Color',
		property: 'hoverColor'
	},
	{
		type: 'color',
		label: 'Visited Color',
		property: 'visitedColor'
	},
	divider,
	sliderFontSize,
	sliderOpacity,
	divider,
	fontDecoration,
	textAlign
];

const paragraphConfig: ConfigItem[] = [
	titleText,
	fontWeight,
	divider,
	colorInput,
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
	{
		type: 'number',
		property: 'lineHeight',
		label: 'Line Height',
		options: {
			min: 0,
			max: 100
		}
	},
	margin,
	padding,
	divider,
	sliderFontSize,
	sliderOpacity,
	divider,
	fontDecoration,
	textAlign
];

// Export named configs
export {
	titleConfig as titleEditbarConfig,
	linkConfig as linkEditbarConfig,
	paragraphConfig as paragraphEditbarConfig
};
