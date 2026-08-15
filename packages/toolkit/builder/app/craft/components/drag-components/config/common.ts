/**
 * Common configuration items
 */
import { AlignCenter, AlignLeft, AlignRight, Bold, CaseLower, Italic, Underline } from 'lucide-react';
import { ConfigItem } from '../../../types';

// Define all configs as constants
const titleTextConfig: ConfigItem = {
	type: 'textarea',
	property: 'text',
	label: 'Content'
};

const sliderFontSizeConfig: ConfigItem = {
	type: 'number',
	property: 'fontSize',
	label: 'Font Size',
	options: {
		max: 100,
		min: 0
	}
};

const fontWeightConfig: ConfigItem = {
	type: 'select',
	label: 'Font Weight',
	property: 'fontWeight',
	list: [
		{ value: '100', label: 'Thin' },
		{ value: '200', label: 'Extra Light' },
		{ value: '300', label: 'Light' },
		{ value: '400', label: 'Normal' },
		{ value: '500', label: 'Medium' },
		{ value: '600', label: 'Semi Bold' },
		{ value: '700', label: 'Bold' },
		{ value: '800', label: 'Extra Bold' },
		{ value: '900', label: 'Black' }
	]
};

const sliderOpacityConfig: ConfigItem = {
	type: 'number',
	property: 'opacity',
	label: 'Opacity',
	options: {
		max: 100,
		min: 0
	}
};

const colorInputConfig: ConfigItem = {
	type: 'color',
	property: 'color',
	label: 'Color'
};

const backgroundColorInputConfig: ConfigItem = {
	type: 'color',
	property: 'backgroundColor',
	label: 'Background Color'
};

const fontDecorationConfig: ConfigItem = {
	type: 'toggle',
	label: 'Font Style',
	property: 'fontDecoration',
	list: [
		{ value: 'none', Icon: CaseLower },
		{ value: 'bold', Icon: Bold },
		{ value: 'italic', Icon: Italic },
		{ value: 'underline', Icon: Underline }
	]
};

const dividerConfig: ConfigItem = {
	type: 'divider',
	property: '',
	label: ''
};

const textAlignConfig: ConfigItem = {
	type: 'toggle',
	label: 'Align',
	property: 'align',
	list: [
		{ value: 'left', Icon: AlignLeft },
		{ value: 'center', Icon: AlignCenter },
		{ value: 'right', Icon: AlignRight }
	]
};

const positionAlignConfig: ConfigItem = {
	type: 'toggle',
	label: 'Align',
	property: 'align',
	list: [
		{ value: 'start', Icon: AlignLeft },
		{ value: 'center', Icon: AlignCenter },
		{ value: 'end', Icon: AlignRight }
	]
};

const marginConfig: ConfigItem = {
	type: 'spacing',
	property: 'margin',
	label: ''
};

const paddingConfig: ConfigItem = {
	type: 'spacing',
	property: 'padding',
	label: 'Padding'
};

// Export as named exports
export {
	titleTextConfig as titleText,
	sliderFontSizeConfig as sliderFontSize,
	fontWeightConfig as fontWeight,
	sliderOpacityConfig as sliderOpacity,
	colorInputConfig as colorInput,
	backgroundColorInputConfig as backgroundColorInput,
	fontDecorationConfig as fontDecoration,
	dividerConfig as divider,
	textAlignConfig as textAlign,
	positionAlignConfig as positionAlign,
	marginConfig as margin,
	paddingConfig as padding
};
