'use client';

import { useCallback, useState } from 'react';

import type { TimerCarry } from '@/core/lib/utils/time-entry-reuse';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export interface TimerTaskStartRequest {
	id: number;
	task: TTask;
	/** The billable status and notes of a continued entry; a plain start of the task carries none. */
	carry: TimerCarry | null;
}

function nextRequestIdOf(current: TimerTaskStartRequest | null) {
	if (!current) {
		return 1;
	}
	return current.id + 1;
}

/**
 * Asks for a timer start on a task from outside its card (a continued time entry, a recent task). The request is
 * handed to `TimerTaskStartLayer`, which runs it through the hooks of the task's own Start button.
 */
export function useTimerTaskStart() {
	const [request, setRequest] = useState<TimerTaskStartRequest | null>(null);

	const startOn = useCallback((task: TTask, carry: TimerCarry | null = null) => {
		setRequest((current) => ({ id: nextRequestIdOf(current), task, carry }));
	}, []);

	return { request, startOn };
}

export type StartTimerOn = ReturnType<typeof useTimerTaskStart>['startOn'];
