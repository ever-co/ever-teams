import { useAtomValue } from 'jotai';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';
import { EverCard } from '@/core/components/common/ever-card';
import { clsxm } from '@/core/lib/utils';
import { ChevronDown } from '@/core/components/icons';
import { isOwnTrackingOffState } from '@/core/stores/timer/active-timer';
import { TrackingOffNotice } from '@/core/components/timer/tracking-off-notice';
import { AuthUserTaskInputSkeleton } from '../../common/skeleton/auth-user-task-input-skeleton';
import {
	TASK_BLOCK_CLASS_NAME,
	TASK_BLOCK_TIMER_CLASS_NAME,
	TASK_INPUT_COLUMN_CLASS_NAME,
	TASK_INPUT_FOLDED_CLASS_NAME,
	TASK_INPUT_TOGGLE_CLASS_NAME,
	TASK_INPUT_WITHOUT_TIMER_CLASS_NAME,
	TIMER_PANE,
	TRACKING_OFF_NOTICE_CLASS_NAME
} from '@/core/components/pages/dashboard/task-timer-section';

/** The home task block while the task and the timer load: the same card, columns and pane as `TaskTimerSection`. */
export function TaskTimerSectionSkeleton({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	// The reason a member whose tracking is off reads in the pane is already known: it shows at once
	const isOwnTrackingOff = useAtomValue(isOwnTrackingOffState);
	const showsTrackingOff = !isTrackingEnabled && isOwnTrackingOff;
	const hasPane = isTrackingEnabled || showsTrackingOff;
	const inputClassName = clsxm(
		TASK_INPUT_COLUMN_CLASS_NAME,
		TASK_INPUT_FOLDED_CLASS_NAME,
		!hasPane && TASK_INPUT_WITHOUT_TIMER_CLASS_NAME
	);
	return (
		<EverCard shadow="custom" className={TASK_BLOCK_CLASS_NAME}>
			<AuthUserTaskInputSkeleton className={inputClassName} />
			<div aria-hidden="true" className={TASK_INPUT_TOGGLE_CLASS_NAME}>
				<ChevronDown className="size-5" />
			</div>
			{isTrackingEnabled && (
				<div className={TIMER_PANE}>
					<TimerSkeleton className={TASK_BLOCK_TIMER_CLASS_NAME} />
				</div>
			)}
			{showsTrackingOff && (
				<div className={TIMER_PANE}>
					<TrackingOffNotice className={TRACKING_OFF_NOTICE_CLASS_NAME} />
				</div>
			)}
		</EverCard>
	);
}
