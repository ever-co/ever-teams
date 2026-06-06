'use client';
import '../globals.css'; // Path to your global CSS file

import { PlasmicRootProvider } from '@plasmicapp/loader-nextjs';
import { PREVIEW_PLASMIC } from './plasmic-init';
import {
	TeamsModernCloc,
	TeamsSmallTimer,
	TeamsBasicProgress,
	BasicCalendar,
	BasicLineChart,
	BasicProgressCircle,
	BasicDatePicker,
	BasicDateRanger,
	BasicAreaChart,
	BasicMember,
	BasicTooltipChart,
	BasicBarChart,
	CardTeamsReportDisplayer,
	BasicTeamsButton,
	BasicTeamsProgress,
	ThemeSelect,
	BasicRadialChart,
	BasicRadarChart
} from './components';

import { defaultData } from '@ever-teams/atoms';

export function PlasmicClientRootProvider(props: Omit<React.ComponentProps<typeof PlasmicRootProvider>, 'loader'>) {
	return <PlasmicRootProvider loader={PREVIEW_PLASMIC} {...props}></PlasmicRootProvider>;
}
PREVIEW_PLASMIC.registerComponent(BasicCalendar, {
	name: 'Teams Calendar',
	props: {
		className: {
			type: 'string'
		},
		classNames: {
			type: 'string'
		},
		showOutsideDays: {
			type: 'boolean',
			defaultValue: true
		}
	}
});

PREVIEW_PLASMIC.registerComponent(ThemeSelect, {
	name: 'Teams Theme select',
	props: {}
});

PREVIEW_PLASMIC.registerComponent(TeamsModernCloc, {
	name: 'Teams Modern',
	props: {
		showProgress: {
			type: 'boolean',
			defaultValue: false,
			displayName: 'Show Progress'
		},
		expandable: {
			type: 'boolean',
			defaultValue: true,
			displayName: 'Expandable'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicTeamsButton, {
	name: 'Button Start Timer',
	props: {
		size: {
			defaultValue: 'default',
			type: 'choice',
			options: [
				{
					label: 'Default',
					value: 'default'
				},
				{
					label: 'Small',
					value: 'sm'
				},
				{
					label: 'Large',
					value: 'lg'
				}
			]
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicTeamsProgress, {
	name: 'Progress Timer',
	props: {
		className: {
			type: 'string'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(TeamsSmallTimer, {
	name: 'Teams SmallTimer',
	props: {
		border: {
			required: true,
			type: 'choice',
			defaultValue: 'thick',
			displayName: 'Border',
			options: [
				{
					label: 'None',
					value: 'none'
				},
				{
					label: 'Thick',
					value: 'thick'
				},
				{
					label: 'Thin',
					value: 'thin'
				}
			]
		},
		background: {
			type: 'choice',
			displayName: 'Background',
			options: [
				{
					label: 'Primary',
					value: 'primary'
				},
				{
					label: 'Secondary',
					value: 'secondary'
				},
				{
					label: 'Destructive',
					value: 'destructive'
				}
			]
		},
		color: {
			type: 'choice',
			defaultValue: 'secondary',
			displayName: 'Color',
			required: true,
			options: [
				{
					label: 'Primary',
					value: 'primary'
				},
				{
					label: 'Secondary',
					value: 'secondary'
				},
				{
					label: 'Destructive',
					value: 'destructive'
				}
			]
		},
		rounded: {
			type: 'choice',
			defaultValue: 'large',
			displayName: 'Rounded',
			options: [
				{
					label: 'None',
					value: 'none'
				},
				{
					label: 'Small',
					value: 'small'
				},
				{
					label: 'Medium',
					value: 'medium'
				},
				{
					label: 'Large',
					value: 'large'
				}
			]
		},
		className: {
			type: 'string'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(TeamsBasicProgress, {
	name: 'Teams Progress',
	props: {
		progress: {
			type: 'boolean',
			defaultValue: false,
			displayName: 'Progress'
		},
		icon: {
			type: 'boolean',
			defaultValue: false,
			displayName: 'Icon'
		},
		labeled: {
			displayName: 'Labeled',
			type: 'boolean',
			defaultValue: false
		},
		background: {
			type: 'choice',
			defaultValue: 'none',
			displayName: 'Background',
			options: [
				{ label: 'None', value: 'none' },
				{ label: 'Primary', value: 'primary' },
				{ label: 'Secondary', value: 'secondary' },
				{ label: 'Destructive', value: 'destructive' }
			]
		},
		rounded: {
			type: 'choice',
			defaultValue: 'none',
			displayName: 'Rounded',
			options: [
				{ label: 'None', value: 'none' },
				{ label: 'Small', value: 'small' },
				{ label: 'Medium', value: 'medium' },
				{ label: 'Large', value: 'large' }
			]
		},
		className: {
			type: 'string',
			displayName: 'className'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicLineChart, {
	name: 'Teams LineChart',
	props: {
		data: {
			type: 'object',
			defaultValue: defaultData,
			fields: {
				label: {
					type: 'string',
					displayName: 'Label'
				},
				value: {
					type: 'number',
					displayName: 'Value'
				}
			},
			displayName: 'Data'
		},
		title: {
			type: 'string',
			displayName: 'Title'
		},
		description: {
			type: 'string',
			displayName: 'Description'
		},
		draggable: {
			type: 'boolean',
			displayName: 'Draggable',
			defaultValue: false
		},
		layout: {
			type: 'string',
			displayName: 'Layout'
		}
	}
});

const defaultColors = {
	primary: 'var(--primaryColor)',
	secondary: 'var(--secondaryColor)',
	background: '#8e06bb39'
};

PREVIEW_PLASMIC.registerComponent(BasicProgressCircle, {
	name: 'Teams Progress Circle',
	props: {
		radius: {
			type: 'number',
			defaultValue: 45,
			displayName: 'Radius',
			description: 'The radius of the progress circle.'
		},
		strokeWidth: {
			type: 'number',
			defaultValue: 10,
			displayName: 'Stroke Width',
			description: "The width of the circle's stroke."
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicDatePicker, {
	name: 'Teams DatePicker',
	props: {
		icon: {
			displayName: 'icon',
			type: 'boolean'
		},
		placeholder: {
			displayName: 'placeholder',
			type: 'string'
		},
		className: {
			displayName: 'className',
			type: 'string'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicDateRanger, {
	name: 'Teams DateRange',
	props: {
		className: {
			displayName: 'className',
			type: 'string'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicAreaChart, {
	name: 'Teams Area Chart',
	props: {
		data: {
			type: 'object',
			defaultValue: [
				{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
				{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
				{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
				{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
				{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
				{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
				{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
			],
			description: 'Data for the chart'
		},
		title: {
			type: 'string',
			defaultValue: 'Area Chart',
			displayName: 'Title'
		},
		description: {
			type: 'string',
			defaultValue: 'A basic area chart displaying weekly data.',
			displayName: 'Description'
		},
		draggable: {
			type: 'boolean',
			defaultValue: false,
			displayName: 'Draggable'
		},
		layout: {
			type: 'string',
			defaultValue: 'default',
			displayName: 'Layout'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicMember, {
	name: 'Teams Member',
	thumbnailUrl: '/img/member.png',
	props: {
		values: {
			type: 'object',
			defaultValue: [
				{ label: 'Kevin Peterson', progress: 30, color: '#34d399' },
				{ label: 'Josh Kenan', progress: 25, color: '#eab308' },
				{ label: 'Arick Bulienine', progress: 75, color: '#eab308' },
				{ label: 'Innocent Akim', progress: 100, color: '#10b981' }
			],
			displayName: 'Values'
		},
		size: {
			type: 'choice',
			displayName: 'Size',
			defaultValue: 'default',
			options: [
				{ label: 'Default', value: 'default' },
				{ label: 'Small', value: 'sm' },
				{ label: 'Large', value: 'lg' }
			]
		},
		showProgress: {
			type: 'boolean',
			defaultValue: false,
			displayName: 'Show Progress'
		},
		showTime: {
			type: 'boolean',
			defaultValue: false,
			displayName: 'Show Time'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicTooltipChart, {
	name: 'Teams TooltipChart',
	props: {
		data: {
			type: 'object',
			defaultValue: [
				{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
				{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
				{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
				{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
				{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
				{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
				{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
			]
		},
		title: {
			type: 'string',
			displayName: 'Title'
		},
		label: {
			type: 'string',
			displayName: 'Label'
		},
		layout: {
			type: 'string',
			displayName: 'Layout'
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicBarChart, {
	name: 'Teams BarChart',
	props: {
		data: {
			type: 'object',
			defaultValue: [
				{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
				{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
				{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
				{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
				{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
				{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
				{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
			]
		},
		title: {
			type: 'string',
			defaultValue: 'Chart Title'
		},
		description: {
			type: 'string',
			defaultValue: 'Description of the chart'
		},
		draggable: {
			type: 'boolean',
			defaultValue: false
		},
		layout: {
			type: 'choice',
			defaultValue: 'horizontal',
			displayName: 'Position',
			options: [
				{ label: 'Vertical', value: 'vertical' },
				{ label: 'Horizontal', value: 'horizontal' }
			],
			advanced: true
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicRadialChart, {
	name: 'Teams Radial chart',
	props: {
		data: {
			type: 'object',
			defaultValue: [
				{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
				{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
				{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
				{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
				{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
				{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
				{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
			]
		},
		title: {
			type: 'string',
			defaultValue: 'Chart Title'
		},
		description: {
			type: 'string',
			defaultValue: 'Description of the chart'
		},
		draggable: {
			type: 'boolean',
			defaultValue: false
		},
		layout: {
			type: 'choice',
			defaultValue: 'horizontal',
			displayName: 'Position',
			options: [
				{ label: 'Vertical', value: 'vertical' },
				{ label: 'Horizontal', value: 'horizontal' }
			],
			advanced: true
		}
	}
});

PREVIEW_PLASMIC.registerComponent(BasicRadarChart, {
	name: 'Teams Radar chart',
	props: {
		data: {
			type: 'object',
			defaultValue: [
				{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
				{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
				{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
				{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
				{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
				{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
				{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
			]
		},
		title: {
			type: 'string',
			defaultValue: 'Chart Title'
		},
		description: {
			type: 'string',
			defaultValue: 'Description of the chart'
		},
		draggable: {
			type: 'boolean',
			defaultValue: false
		},
		layout: {
			type: 'choice',
			defaultValue: 'horizontal',
			displayName: 'Position',
			options: [
				{ label: 'Vertical', value: 'vertical' },
				{ label: 'Horizontal', value: 'horizontal' }
			],
			advanced: true
		}
	}
});

PREVIEW_PLASMIC.registerComponent(CardTeamsReportDisplayer, {
	name: 'Teams Card',
	props: {
		time: {
			type: 'string',
			defaultValue: '12:00',
			description: 'Time to display'
		},
		period: {
			type: 'string',
			defaultValue: 'AM',
			description: 'AM or PM'
		},
		icon: {
			type: 'slot',
			description: 'Optional icon to display'
		},
		user: {
			type: 'string',
			defaultValue: 'Salva',
			description: 'User name to display'
		}
	}
});
