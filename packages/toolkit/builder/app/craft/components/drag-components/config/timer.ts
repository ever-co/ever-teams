/**
 * Timer component configurations
 */
import { ConfigItem } from '../../../types';
import { divider, positionAlign } from './common';

// Define config arrays
const modernTeamsConfig: ConfigItem[] = [
	{
		type: 'text',
		label: 'Separator',
		property: 'separator'
	},
	positionAlign,
	divider,
	{
		type: 'switch',
		label: 'Expandable',
		property: 'expandable'
	},
	{
		type: 'switch',
		label: 'Show Progress',
		property: 'showProgress'
	}
];

const teamsEssentialTimerConfig: ConfigItem[] = [
	{
		type: 'switch',
		label: 'Read Only',
		property: 'readonly'
	},
	{
		type: 'switch',
		label: 'Icon',
		property: 'icon'
	},
	divider,
	positionAlign,
	divider,
	{
		label: 'Background',
		property: 'background',
		type: 'select',
		list: [
			{ label: 'Primary', value: 'primary' },
			{ label: 'Secondary', value: 'secondary' },
			{ label: 'Destructive', value: 'destructive' }
		]
	},
	{
		type: 'select',
		label: 'Rounded',
		property: 'rounded',
		list: [
			{ label: 'Small', value: 'small' },
			{ label: 'Medium', value: 'medium' },
			{ label: 'Large', value: 'large' }
		]
	},
	{
		label: 'Format',
		property: 'format',
		type: 'select',
		list: [
			{ label: 'Default', value: 'default' },
			{ label: 'Compact', value: 'compact' },
			{ label: 'Hours Minutes', value: 'hours_minutes' },
			{ label: 'Words', value: 'words' },
			{ label: 'Minimal', value: 'minimal' }
		]
	}
];

const timerVariantButtonConfig: ConfigItem[] = [
	{
		label: 'Size',
		property: 'size',
		type: 'select',
		list: [
			{ label: 'Default', value: 'default' },
			{ label: 'Small', value: 'sm' },
			{ label: 'Large', value: 'lg' }
		]
	}
];

const progressCircleVariantConfig: ConfigItem[] = [
	{
		type: 'number',
		property: 'radius',
		label: 'Radius',
		options: {
			min: 0,
			max: 100
		}
	},
	{
		type: 'number',
		label: 'Stroke Width',
		property: 'strokeWidth',
		options: {
			min: 0,
			max: 100
		}
	}
];

const timerVariantProgressConfig: ConfigItem[] = [
	{
		label: 'ClassName',
		property: 'className',
		type: 'text'
	}
];

const baseTimerConfig: ConfigItem[] = [
	{
		type: 'switch',
		label: 'Read Only',
		property: 'readonly'
	},
	{
		type: 'switch',
		label: 'Icon',
		property: 'icon'
	},
	divider,
	positionAlign,
	divider,
	{
		label: 'Background',
		property: 'background',
		type: 'select',
		list: [
			{ label: 'Primary', value: 'primary' },
			{ label: 'Secondary', value: 'secondary' },
			{ label: 'Destructive', value: 'destructive' }
		]
	},
	{
		type: 'select',
		label: 'Rounded',
		property: 'rounded',
		list: [
			{ label: 'Small', value: 'small' },
			{ label: 'Medium', value: 'medium' },
			{ label: 'Large', value: 'large' }
		]
	}
];

const memberConfig: ConfigItem[] = [
	{
		type: 'select',
		property: 'size',
		label: 'size',
		list: [
			{ label: 'Default', value: 'default' },
			{ label: 'Small', value: 'sm' },
			{ label: 'Large', value: 'lg' }
		]
	},
	{
		type: 'switch',
		label: 'ShowTime',
		property: 'showTime'
	},
	{
		type: 'switch',
		label: 'ShowProgress',
		property: 'showProgress'
	},
	{
		type: 'text',
		label: 'className',
		property: 'className'
	}
];

// Export named configs
export {
	modernTeamsConfig as modernTeamsEditbarConfig,
	teamsEssentialTimerConfig as teamsEssentialTimerEditbarConfig,
	timerVariantButtonConfig as timerVariantButtonEditbarConfig,
	progressCircleVariantConfig as progressCircleVariantEditbarConfig,
	timerVariantProgressConfig as timerVariantProgressEditbarConfig,
	baseTimerConfig as baseTimerEditbarConfig,
	memberConfig as memberEditbarConfig
};
