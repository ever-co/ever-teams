import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';
import { EverCard } from '@/core/components/common/ever-card';
import { clsxm } from '@/core/lib/utils';
import { ChevronDown } from '@/core/components/icons';
import { AuthUserTaskInputSkeleton } from '../../common/skeleton/auth-user-task-input-skeleton';
import {
	TASK_BLOCK_CLASS_NAME,
	TASK_BLOCK_TIMER_CLASS_NAME,
	TASK_INPUT_COLUMN_CLASS_NAME,
	TASK_INPUT_FOLDED_CLASS_NAME,
	TASK_INPUT_TOGGLE_CLASS_NAME,
	TASK_INPUT_WITHOUT_TIMER_CLASS_NAME,
	TIMER_PANE
} from '@/core/components/pages/dashboard/task-timer-section';

/** The home task block while the task and the timer load: the same card, columns and pane as `TaskTimerSection`. */
export function TaskTimerSectionSkeleton({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	const inputClassName = clsxm(
		TASK_INPUT_COLUMN_CLASS_NAME,
		TASK_INPUT_FOLDED_CLASS_NAME,
		!isTrackingEnabled && TASK_INPUT_WITHOUT_TIMER_CLASS_NAME
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
		</EverCard>
	);
}
