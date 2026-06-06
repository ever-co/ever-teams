import { COMPONENT_CATEGORIES } from '../constants/component-defaults';

// Timer Components
import { timerConfig } from './basic-timer/base-timer/config';
import { teamsBasicConfig } from './basic-timer/teams-basic/config';
import { modernTimerConfig } from './basic-timer/teams-modern-timer/config';
import { teamsTimerButtonConfig } from './basic-timer/teams-timer-button/config';

// Chart Components
import { areaChartConfig } from './basic-chart/basic-area-chart/config';
import { barChartConfig } from './basic-chart/basic-bar-chart/config';
import { tooltipChartConfig } from './basic-chart/basic-tooltip-chart/config';
import { barChartVerticalConfig } from './basic-chart/basic-bar-vertical/config';
import { lineChartConfig } from './basic-chart/basic-line-chart/config';
import { radarChartConfig } from './basic-chart/basic-radar-chart/config';
import { radialChartConfig } from './basic-chart/basic-radial-chart/config';

// Date Components
import { basicDateRangerConfig } from './basic-picker/date-ranger/config';
import { basicDatePickerConfig } from './basic-picker/date-picker/config';
import { basicCalendarConfig } from './basic-calendar/config';

// Progress Components
import { progressCircleConfig } from './basic-circle/config';

// Card Components
import { cardConfig } from './basic-card/config';

// Form Components
import { checkboxConfig } from './basic-checkbox/config';

// Other Components
import { basicMemberConfig } from './basic-member/config';

export const componentConfigs = {
	[COMPONENT_CATEGORIES.TIMER]: [timerConfig, teamsBasicConfig, modernTimerConfig, teamsTimerButtonConfig],
	[COMPONENT_CATEGORIES.CHART]: [
		areaChartConfig,
		barChartConfig,
		lineChartConfig,
		radialChartConfig,
		radarChartConfig,
		tooltipChartConfig,
		barChartVerticalConfig
	],
	[COMPONENT_CATEGORIES.DATE]: [basicCalendarConfig, basicDateRangerConfig, basicDatePickerConfig],
	[COMPONENT_CATEGORIES.PROGRESS]: [progressCircleConfig],
	[COMPONENT_CATEGORIES.CARD]: [cardConfig],
	[COMPONENT_CATEGORIES.FORM]: [checkboxConfig],
	[COMPONENT_CATEGORIES.OTHER]: [basicMemberConfig]
};

export * from './index';
