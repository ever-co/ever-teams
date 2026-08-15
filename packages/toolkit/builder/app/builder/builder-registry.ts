'use client';

import builder, { Builder } from '@builder.io/react';
import { baseUrlImg } from '@/lib/utils';
import {
	TimerIconUrl,
	ProgressIconUrl,
	TeamsProgressIconUrl,
	SmallTimeIconUrl,
	DatepickerIconUrl,
	TeamsButtonIconUrl,
	CardIconUrl,
	ModalIconUrl,
	CounterIconUrl,
	FormInputIconUrl,
	TeamsSelectThemeIconUrl,
	HeadingIconUrl,
	ShadcnButtonIconUrl,
	BasicMemberIconUrl,
	SelectIconUrl,
	ProgressCircleIconUrl,
	ThemeSystemIconUrl,
	TableIconUrl,
	BadgeIconUrl,
	ColLayoutIconUrl,
	ColContainerIconUrl,
	GridLayoutIconUrl,
	CarouselSpacingIconUrl,
	CheckboxIconUrl
} from './svg-icons';

// Component Imports
import {
	// Graph Components
	BasicBarChart,
	BasicLineChart,
	BasicTooltipChart,
	BasicBarChartVertical,
	InputMember,
	BasicAreaChart,
	BasicRadarChart,
	BasicRadialChart,

	// Date & Time Components
	BasicDatePicker,
	BasicCalendar,
	BasicDateRanger,
	TeamsBasicTimer,
	InputsBasicTimer,
	InputsSmallTimer,
	SmallTimer,

	// Layout Components
	ColContainer,
	ColLayout,
	GridLayout,
	BasicModal,
	CardTeamsReportDisplayer,
	InputCardTeamsReportDisplayer,

	// Timer Components
	TeamsEssentialTimerProgress,
	InputTeamsEssentialTimerProgress,
	TeamsModernTimer,
	InputModernTeams,
	BasicThemeSelect,

	// UI Components
	Button as ShadcnButton,
	BasicMember,
	BasicBadge,
	InputBadge,
	BasicSelect,
	InputBasicSelect,
	BasicTable,
	InputBasicTable,
	BasicProgressCircle,
	InputBasicProgressCircle,
	BasicCarouselSpacing,
	InputBasicCarousel,
	BasicTheme,
	InputBasicTheme,
	BasicTeamsProgress,
	InputTeamsProgress,
	BasicTeamsButton,
	InputTeamsButton
} from './components';

import { Checkbox } from '@ever-teams/atoms';
import { BUILDER_API_KEY } from './config/builder';
import Counter from './components/counters/Counter';
import FormInput from './components/counters/FormInput';
import Heading from './components/counters/Heading';
import { BasicCheckbox, InputTeamsCheckbox } from './components/basic-checkbox';

// Initialize Builder
builder.init(BUILDER_API_KEY);

// Register Insert Menus
const insertMenus = [
	{
		name: 'Teams Timers',
		items: ['Timer', 'Progress', 'TeamsBasicProgress', 'TeamsModernTimer', 'SmallTime']
	},
	{
		name: 'Teams Date Component',
		items: ['DatePicker', 'DateRanger', 'Calendar']
	},
	{
		name: 'Teams Charts',
		items: [
			'Bar Chart Vertical',
			'Line Chart',
			'Bar Chart',
			'Radial Chart',
			'Radar Chart',
			'Area Chart',
			'TooltipChart'
		]
	},
	{
		name: 'Teams UI',
		items: [
			'Teams Button',
			'Basic Checkbox',
			'Card',
			'Modal',
			'Counter',
			'FormInput',
			'Teams Select Theme',
			'Heading',
			'ShadcnButton',
			'Basic Member',
			'Select',
			'ProgressCircle',
			'Theme system',
			'Table',
			'Badge'
		]
	},
	{
		name: 'Teams Layout',
		items: ['ColLayout', 'ColContainer', 'GridLayout', 'CarouselSpacing']
	}
];

insertMenus.forEach((menu) => {
	Builder.register('insertMenu', {
		name: menu.name,
		items: menu.items.map((name) => ({ name }))
	});
});

// Component Registrations
const componentRegistrations = [
	{
		component: BasicDatePicker,
		name: 'DatePicker',
		image: DatepickerIconUrl,
		inputs: [
			{ name: 'icon', type: 'boolean' },
			{ name: 'placeholder', type: 'string' },
			{ name: 'className', type: 'string' }
		]
	},
	{
		component: TeamsBasicTimer,
		name: 'Timer',
		inputs: InputsBasicTimer,
		image: TimerIconUrl
	},
	{
		component: BasicTeamsProgress,
		name: 'Progress',
		inputs: InputTeamsProgress,
		image: ProgressIconUrl
	},
	{
		component: BasicBarChartVertical,
		name: 'Bar Chart Vertical',
		image: `${baseUrlImg}/img/line_chart.png`
	},
	{
		component: BasicLineChart,
		name: 'Line Chart',
		image: `${baseUrlImg}/img/line_chart.png`
	},
	{
		component: BasicBarChart,
		name: 'Bar Chart',
		image: `${baseUrlImg}/img/chart.png`
	},
	{
		component: BasicRadialChart,
		name: 'Radial Chart',
		image: `${baseUrlImg}/img/chart.png`
	},
	{
		component: BasicRadarChart,
		name: 'Radar Chart',
		image: `${baseUrlImg}/img/chart.png`
	},
	{
		component: BasicAreaChart,
		name: 'Area Chart',
		image: `${baseUrlImg}/img/area_chart.png`
	},
	{
		component: BasicTooltipChart,
		name: 'TooltipChart',
		image: `${baseUrlImg}/img/tooltip.png`
	},
	{
		component: BasicCalendar,
		name: 'Calendar',
		image: `${baseUrlImg}/img/calendar.png`,
		inputs: [{ name: 'className', type: 'string' }]
	},
	{
		component: BasicDateRanger,
		name: 'DateRanger',
		image: `${baseUrlImg}/img/date_range.png`,
		inputs: [{ name: 'className', type: 'string' }]
	},
	{
		component: Counter,
		name: 'Counter',
		image: CounterIconUrl,
		inputs: [
			{
				name: 'initialCount',
				type: 'number'
			}
		]
	},
	{
		component: FormInput,
		name: 'FormInput',
		image: FormInputIconUrl,
		inputs: [
			{ name: 'fontSize', type: 'string', defaultValue: '20px' },
			{ name: 'borderColor', type: 'string', defaultValue: 'gray' },
			{ name: 'borderWidth', type: 'string', defaultValue: '1px' },
			{ name: 'borderRadius', type: 'string', defaultValue: '10px' },
			{ name: 'width', type: 'string', defaultValue: '230px' },
			{ name: 'color', type: 'string', defaultValue: 'black' }
		]
	},
	{
		component: BasicThemeSelect,
		image: TeamsSelectThemeIconUrl,
		name: 'Teams Select Theme'
	},
	{
		component: Heading,
		name: 'Heading',
		image: HeadingIconUrl,
		inputs: [
			{ name: 'title', type: 'string', defaultValue: 'Hello World' },
			{ name: 'color', type: 'string', defaultValue: 'black' },
			{ name: 'fontSize', type: 'number', defaultValue: '40px' },
			{
				name: 'fontWeight',
				type: 'enum',
				required: true,
				friendlyName: 'Font Weight',
				defaultValue: '40px',
				enum: [
					{ label: 'Thin', value: '40px' },
					{ label: 'Thick', value: '40px' },
					{ label: 'Fill', value: '40px' },
					{ label: 'None', value: '40px' },
					{ label: 'Scale Down', value: '40px' }
				]
			}
		]
	},
	{
		component: BasicModal,
		image: ModalIconUrl,
		name: 'Modal'
	},
	{
		component: CardTeamsReportDisplayer,
		name: 'Card',
		image: CardIconUrl,
		inputs: InputCardTeamsReportDisplayer
	},
	{
		component: BasicTeamsButton,
		name: 'Teams Button',
		image: TeamsButtonIconUrl,
		inputs: InputTeamsButton
	},
	{
		component: BasicCheckbox,
		name: 'Basic Checkbox',
		image: CheckboxIconUrl,
		inputs: InputTeamsCheckbox
	},
	{
		component: SmallTimer,
		name: 'SmallTime',
		inputs: InputsSmallTimer,
		image: SmallTimeIconUrl
	},
	{
		component: TeamsEssentialTimerProgress,
		name: 'TeamsEssentialTimerProgress',
		inputs: InputTeamsEssentialTimerProgress,
		image: TeamsProgressIconUrl
	},
	{
		component: ColLayout,
		image: ColLayoutIconUrl,
		name: 'Col Layout',
		inputs: [
			{
				name: 'rows',
				type: 'number',
				defaultValue: 3
			}
		]
	},
	{
		component: ColContainer,
		image: ColContainerIconUrl,
		name: 'ColContainer',
		inputs: [
			{
				name: 'item',
				type: 'number',
				defaultValue: 0
			},
			{
				name: 'uid',
				type: 'string',
				defaultValue: ''
			}
		]
	},
	{
		component: TeamsModernTimer,
		name: 'TeamsModernTimer',
		image: `${baseUrlImg}/img/timer.png`,
		inputs: InputModernTeams
	},
	{
		component: ShadcnButton,
		name: 'ShadcnButton',
		image: ShadcnButtonIconUrl,
		inputs: [
			{
				type: 'string',
				name: 'text',
				defaultValue: 'submit'
			},
			{
				name: 'size',
				type: 'number'
			},
			{
				name: 'variant',
				type: 'string',
				defaultValue: ''
			},
			{
				name: 'width',
				type: 'number'
			},
			{
				name: 'height',
				type: 'number'
			},
			{
				name: 'color',
				type: 'string'
			},
			{
				name: 'className',
				type: 'string',
				defaultValue: 'bg-blue-800'
			}
		]
	},
	{
		component: BasicMember,
		name: 'Basic Member',
		image: `${baseUrlImg}/img/member.png`,
		inputs: InputMember
	},
	{
		component: GridLayout,
		image: GridLayoutIconUrl,
		name: 'GridLayout'
	},
	{
		component: BasicTheme,
		name: 'Theme system',
		image: ThemeSystemIconUrl,
		inputs: InputBasicTheme
	},
	{
		component: BasicSelect,
		name: 'Select',
		image: SelectIconUrl,
		inputs: InputBasicSelect
	},
	{
		component: BasicTable,
		name: 'Table',
		image: TableIconUrl,
		inputs: InputBasicTable
	},
	{
		component: BasicProgressCircle,
		name: 'ProgressCircle',
		image: ProgressCircleIconUrl,
		inputs: InputBasicProgressCircle
	},
	{
		component: BasicCarouselSpacing,
		name: 'CarouselSpacing',
		image: CarouselSpacingIconUrl,
		inputs: InputBasicCarousel
	},
	{
		component: BasicBadge,
		name: 'Badge',
		image: BadgeIconUrl,
		inputs: InputBadge
	}
];

// Register all components
componentRegistrations.forEach((registration) => {
	Builder.registerComponent(registration.component, {
		name: registration.name,
		image: registration.image,
		inputs: registration.inputs
	});
});
