/**
 * Timer component related default props
 */
import { TeamsEssentialTimerProps, TimeFormat } from '@ever-teams/atoms';

// Define constants
const modernTeamsObject = {
	separator: ':',
	align: 'start',
	expandable: true,
	showProgress: false,
	format: TimeFormat.DEFAULT
};

const teamsEssentialTimerObject: Readonly<TeamsEssentialTimerProps> = {
	icon: false,
	align: 'start',
	background: 'secondary',
	readonly: false,
	rounded: 'small',
	format: TimeFormat.DEFAULT
};

const baseTimerObject = {
	format: TimeFormat.DEFAULT,
	background: 'primary' as 'primary' | 'secondary' | 'none' | 'destructive',
	border: 'thick' as 'none' | 'thick' | 'thin',
	color: 'secondary' as 'primary' | 'secondary' | 'destructive',
	align: 'left' as const,
	textAlign: '' as string,
	className: 'w-fit' as string,
	rounded: 'small' as 'small' | 'medium' | 'large'
};

const timerVariantButtonObject = {
	size: 'default'
};

const progressCircleVariantObject = {
	radius: 50,
	strokeWidth: 20
};

const memberVariantCardObject = {
	size: 'default',
	showProgress: true,
	showTime: true,
	className: ''
};

const timerVariableProgressObject = {
	className: ''
};

// Export as named exports
export {
	modernTeamsObject as ModernTeamsProps,
	teamsEssentialTimerObject as TeamsEssentialTimerProps,
	baseTimerObject as BaseTimerProps,
	timerVariantButtonObject as TimerVariantButtonProps,
	progressCircleVariantObject as ProgressCircleVariantProps,
	memberVariantCardObject as MemberVariantCardProps,
	timerVariableProgressObject as TimerVariableProgressProps
};
