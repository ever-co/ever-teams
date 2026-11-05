import dynamic from 'next/dynamic';
import { EverCard } from '@/core/components/common/ever-card';
import { clsxm } from '@/core/lib/utils';
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';
import { ChevronDown } from '@/core/components/icons';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';
import { AuthUserTaskInputSkeleton } from '@/core/components/common/skeleton/auth-user-task-input-skeleton';

/** The task block is the page's main surface: a larger radius and a two-step shadow, deeper than the member cards. */
const TASK_BLOCK_ELEVATION =
	'rounded-2xl shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.18)] dark:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.6)]';

export const TASK_BLOCK_CLASS_NAME = clsxm(
	'mb-3 flex w-full min-w-0 max-w-full flex-col-reverse items-start justify-center gap-4 py-4 md:justify-between lg:flex-row lg:gap-4 xl:gap-6',
	'md:px-4',
	TASK_BLOCK_ELEVATION
);

export const TASK_INPUT_COLUMN_CLASS_NAME = 'w-full grow max-w-[72%] lg:max-w-none lg:basis-0';

export const TASK_INPUT_FOLDED_CLASS_NAME = '!hidden md:!flex';

export const TASK_INPUT_WITHOUT_TIMER_CLASS_NAME = 'md:w-full';

export const TASK_INPUT_TOGGLE_CLASS_NAME =
	'w-full rounded-md p-1 md:hidden flex justify-center mt-2 cursor-pointer hairline-ring ring-border text-muted-foreground transition-colors hover:bg-foreground/5';

/** The timer is as wide as its content in the pane, never the 260px minimum it has elsewhere. */
export const TASK_BLOCK_TIMER_CLASS_NAME = 'min-w-0';

const TaskBlockInput = dynamic(
	() => import('@/core/components/auth/auth-user-task-input').then((mod) => ({ default: mod.AuthUserTaskInput })),
	{
		ssr: false,
		loading: () => (
			<AuthUserTaskInputSkeleton className={clsxm(TASK_INPUT_COLUMN_CLASS_NAME, TASK_INPUT_FOLDED_CLASS_NAME)} />
		)
	}
);

const TaskBlockTimer = dynamic(() => import('@/core/components/timer/timer').then((mod) => ({ default: mod.Timer })), {
	ssr: false,
	loading: () => <TimerSkeleton className={TASK_BLOCK_TIMER_CLASS_NAME} />
});

export function TaskTimerSection({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	const [showInput, setShowInput] = useState(false);
	const timerStatus = useAtomValue(timerStatusState);
	const isTimerRunning = Boolean(timerStatus?.running);
	// A timer still running when tracking was turned off keeps its stop control
	const showsTimer = isTrackingEnabled || isTimerRunning;
	return (
		<EverCard shadow="custom" className={TASK_BLOCK_CLASS_NAME}>
			<TaskBlockInput
				className={clsxm(
					TASK_INPUT_COLUMN_CLASS_NAME,
					!showInput && TASK_INPUT_FOLDED_CLASS_NAME,
					!showsTimer && TASK_INPUT_WITHOUT_TIMER_CLASS_NAME
				)}
			/>
			<button
				type="button"
				aria-expanded={showInput}
				onClick={() => setShowInput((p) => !p)}
				className={TASK_INPUT_TOGGLE_CLASS_NAME}
			>
				<ChevronDown
					className={clsxm('size-5 transition-transform', showInput && 'rotate-180')}
					aria-label={showInput ? 'hide the issue input' : 'show the issue input'}
				/>
			</button>
			{/* shrink-0: the timer keeps its natural width; the task-input column (min-w-0) is what gives way,
			    so the play button stays inside the viewport at 1280/1366px with the sidebar open. */}
			{showsTimer && (
				<div className={clsxm(TIMER_PANE, isTimerRunning && TIMER_PANE_RUNNING)}>
					<TaskBlockTimer className={TASK_BLOCK_TIMER_CLASS_NAME} />
				</div>
			)}
		</EverCard>
	);
}

/**
 * The timer sits in the light well of the profile page. From lg it becomes the block's right pane: flush with the
 * card's top, bottom and right edges (cancelling the card padding), its corners inherited, a hairline on its left.
 */
export const TIMER_PANE =
	'flex w-full max-w-fit shrink-0 items-center rounded-xl bg-foreground/[0.025] px-2 lg:-my-4 lg:-mr-4 lg:self-stretch lg:rounded-l-none lg:rounded-r-[inherit] lg:hairline-l lg:border-border lg:px-4';

/** While the timer runs the pane takes the brand tint, so the state reads from across the page. */
const TIMER_PANE_RUNNING = 'bg-primary/[0.05] lg:border-primary/20';
