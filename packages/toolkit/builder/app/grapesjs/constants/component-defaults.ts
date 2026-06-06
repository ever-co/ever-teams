export const COMPONENT_TYPES = {
	BASIC_TIMER: 'basic-timer',
	MODERN_TIMER: 'basic-timer-modern',
	SMALL_TIMER: 'teams-small-timer',
	AREA_CHART: 'basic-areachart',
	CALENDAR: 'basic-calendar',
	PROGRESS_CIRCLE: 'basic-progress-circle',
	CARD_REPORT: 'teams-card-report-displayer'
} as const;

export const DEFAULT_TRAITS = {
	text: {
		type: 'text',
		changeProp: 1
	},
	number: {
		type: 'number',
		changeProp: 1
	},
	checkbox: {
		type: 'checkbox',
		changeProp: 1
	},
	select: {
		type: 'select',
		changeProp: 1
	}
};

export const DEFAULT_COMPONENT_CONFIG = {
	tagName: 'div',
	draggable: '*',
	droppable: true,
	style: {
		padding: '10px',
		margin: '0',
		'min-height': '50px'
	}
};

export const COMPONENT_CATEGORIES = {
	TIMER: 'Timer',
	CHART: 'Chart',
	DATE: 'Date',
	CALENDAR: 'Calendar',
	PROGRESS: 'Progress',
	CARD: 'Card',
	FORM: 'Form',
	OTHER: 'Other'
} as const;
