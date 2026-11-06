import dynamic from 'next/dynamic';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';

/** The timer of the signed-in member's profile sits under its task in the timer card, the button beside the clock. */
export const PROFILE_TIMER_CLASS_NAME = 'min-w-0 gap-4 p-0';

const LazyProfileTimer = dynamic(
	() => import('@/core/components/timer/timer').then((mod) => ({ default: mod.Timer })),
	{
		ssr: false,
		loading: () => <TimerSkeleton className={PROFILE_TIMER_CLASS_NAME} />
	}
);

export function ProfileTimer() {
	return <LazyProfileTimer className={PROFILE_TIMER_CLASS_NAME} compact={true} />;
}
