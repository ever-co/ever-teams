'use client';

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useInvalidateTeamTasks } from '@/core/hooks/organizations/teams/use-invalidate-team-tasks';
import { useRealtimeEvent } from '@/core/hooks/realtime/use-realtime-event';
import { REALTIME_EVENT_NAMES } from '@/core/lib/realtime/events';
import { isMissingRouteError, platformMessageOf } from '@/core/lib/utils/chat-errors';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { taskService } from '@/core/services/client/api/tasks/task.service';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import type { IChatTaskUpdateInput } from '@/core/types/interfaces/common/chat';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * A task card's data: the task it shows, the changes made from it (one after the other), and whether the platform
 * has the route that takes them. The card component (`chat-task-card.tsx`) renders and connects the controls.
 */

const CARD_EVENTS: readonly string[] = [REALTIME_EVENT_NAMES.CHAT_MESSAGE_UPDATED];

/** How long a card trusts a task it read itself (the live channel's `task.updated` reads it sooner). */
const CARD_STALE_MS = 5 * 60_000;

// ---------------------------------------------------------------- a platform without the route

/**
 * The platform answered that it has no task card route (older than it): every card of the page turns read-only at
 * once, and stays so — the platform does not change version under an open page.
 */
let cardChangesMissing = false;
const missingListeners = new Set<() => void>();

function subscribeToMissing(listener: () => void): () => void {
	missingListeners.add(listener);
	return () => {
		missingListeners.delete(listener);
	};
}

function setCardChangesMissing(missing: boolean): void {
	if (cardChangesMissing === missing) return;
	cardChangesMissing = missing;
	for (const listener of missingListeners) listener();
}

/** For the specs. */
export function resetChatTaskCards(): void {
	setCardChangesMissing(false);
}

export function useChatTaskCardChangesMissing(): boolean {
	return useSyncExternalStore(
		subscribeToMissing,
		() => cardChangesMissing,
		() => false
	);
}

// ---------------------------------------------------------------- what a card shows of a change

/** What the card shows of a change while the platform takes it: until the task is read again. */
export interface ChatTaskCardChange {
	status?: { value: string; id: string | null };
	priority?: { value: string | null; id: string | null };
	assigneeIds?: string[];
}

// ---------------------------------------------------------------- reading and changing the task

/**
 * The task a card shows: the team's list copy when the list holds it (no read for the card), otherwise the task read
 * once through the shared detail query (the full task, as the task drawer reads it). Whether the list holds it also
 * says whether the active team's statuses and priorities are the task's own.
 */
export function useChatTaskCardTask(taskId: string): { task: TTask | null; inTeamList: boolean } {
	const listTaskAtom = useMemo(() => selectAtom(tasksByTeamState, (tasks) => tasks.find((task) => task.id === taskId) ?? null), [taskId]);
	const listTask = useAtomValue(listTaskAtom);
	const detail = useQuery<TTask>({
		queryKey: queryKeys.tasks.detail(taskId),
		queryFn: () => taskService.getTaskById(taskId),
		enabled: !!taskId && !listTask,
		staleTime: CARD_STALE_MS,
		retry: false,
		// A task the reader cannot open (another team's, a removed one) is not asked for again on every focus.
		refetchOnWindowFocus: false
	});
	return { task: listTask ?? detail.data ?? null, inTeamList: !!listTask };
}

/**
 * The changes of one card, one after the other (two quick picks of assignees never race: each sends the whole list,
 * in order). The card shows them at once, until the task is read again; once the last one is answered, the task is
 * read again everywhere it shows (the team's lists, its page, the daily plans), as any task change of the app does.
 */
export function useChatTaskCardChanges(messageId: string, taskId: string, task: TTask | null) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { invalidateTeamTasksData } = useInvalidateTeamTasks();
	const [pending, setPending] = useState<{ change: ChatTaskCardChange; base: TTask | null } | null>(null);
	const queue = useRef<Promise<void>>(Promise.resolve());
	const inFlight = useRef(0);
	// A change shows until the task is read again: a new copy of it is the platform's answer, or a newer change.
	const shown = pending && pending.base === task ? pending.change : null;

	const change = useCallback(
		(input: IChatTaskUpdateInput, display: ChatTaskCardChange) => {
			setPending((current) => ({ change: { ...(current && current.base === task ? current.change : {}), ...display }, base: task }));
			inFlight.current += 1;
			queue.current = queue.current.then(async () => {
				try {
					await chatService.updateTask(messageId, taskId, input);
				} catch (error) {
					setPending(null);
					if (isMissingRouteError(error)) setCardChangesMissing(true);
					toast.error(platformMessageOf(error) ?? t('teamChat.TASK_UPDATE_FAILED'));
				} finally {
					inFlight.current -= 1;
					if (inFlight.current === 0) invalidateTeamTasksData(taskId);
				}
			});
		},
		[invalidateTeamTasksData, messageId, t, task, taskId]
	);

	// Every conversation showing the task hears its messages changed when the task is changed from a card elsewhere.
	// A card read from the team's list hears `task.updated` through that list; one read on its own is read again here.
	useRealtimeEvent(CARD_EVENTS, (envelope) => {
		if (inFlight.current > 0) return;
		const data = envelope.data as Record<string, unknown> | null;
		if (data?.messageId === messageId) void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId), exact: true });
	});

	return { shown, change };
}
