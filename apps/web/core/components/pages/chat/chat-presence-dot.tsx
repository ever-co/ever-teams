'use client';

import { TimerStatus } from '@/core/components/timer/timer-status';
import { cn } from '@/core/lib/helpers';
import type { ETimerStatus } from '@/core/types/generics/enums/timer';

const DOT = {
	row: 'size-2',
	tile: 'size-2.5',
	hero: 'size-3.5'
} as const;

/**
 * A person's status as the app's member status dot (`TimerStatus`, its colours and its tooltip), set on the corner of
 * their avatar: the avatar's box must be `relative`.
 */
export function PresenceDot({
	status,
	size = 'row',
	className
}: Readonly<{ status: ETimerStatus; size?: keyof typeof DOT; className?: string }>) {
	return (
		<TimerStatus
			status={status}
			showIcon={false}
			className={cn(DOT[size], 'ring-2 ring-background', className)}
			tooltipClassName="absolute -bottom-px -end-px flex"
		/>
	);
}
