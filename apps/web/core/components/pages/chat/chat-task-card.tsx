'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, Task } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { taskPropertySearchKey } from '@/core/components/tasks/task-property-trigger';
import { PersonAvatar, personFromTaskMember, type Person } from '@/core/components/teams/people-avatars';
import { useChatPeople } from '@/core/hooks/chat/use-chat-scope';
import { useRealtimeEvent } from '@/core/hooks/realtime/use-realtime-event';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskStatusValue } from '@/core/hooks/tasks/use-task-status';
import { REALTIME_EVENT_NAMES } from '@/core/lib/realtime/events';
import { cn } from '@/core/lib/helpers';
import { isMissingRouteError, platformMessageOf } from '@/core/lib/utils/chat-errors';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { taskService } from '@/core/services/client/api/tasks/task.service';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import type { TStatusItem } from '@/core/types/interfaces/task/task-card';
import type { IChatTaskUpdateInput } from '@/core/types/interfaces/common/chat';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** How long a card trusts the task it read (the live channel's `task.updated` and the card's own changes read it sooner). */
const CARD_STALE_MS = 5 * 60_000;

/** How many assignees a card shows as faces before "+N". */
const SHOWN_ASSIGNEES = 3;

/** The permissions that let a reader change a task (the platform asks for one of them as well). */
const TASK_EDIT_PERMISSIONS = ['ORG_TASK_EDIT', 'ALL_ORG_EDIT'];

/** The platform answered that it has no task card route (older than it): cards stay read-only for the page's life. */
let cardChangesMissing = false;

/** For the specs. */
export function resetChatTaskCards(): void {
	cardChangesMissing = false;
}

const CARD_EVENTS: readonly string[] = [REALTIME_EVENT_NAMES.CHAT_MESSAGE_UPDATED];

const PILL =
	'inline-flex h-6 max-w-44 min-w-0 items-center gap-1.5 rounded-md bg-foreground/[0.04] px-1.5 text-xs text-foreground transition-colors';
const PILL_ACTION = 'hover:bg-foreground/[0.08] data-[popup-open]:bg-foreground/[0.08]';

/** What the card shows of a change while the platform takes it: until the task is read again. */
interface CardChange {
	status?: { value: string; id: string | null };
	priority?: { value: string | null; id: string | null };
	assigneeIds?: string[];
}

function itemValue(item: TStatusItem): string {
	return String(item.value ?? item.name ?? '');
}

function itemLabel(item: TStatusItem | undefined, fallback: string | null | undefined): string {
	return item?.realName || item?.name || (fallback ?? '').split('-').join(' ');
}

function findItem(items: readonly TStatusItem[], value: string | null | undefined, id: string | null | undefined): TStatusItem | undefined {
	if (id) {
		const byId = items.find((item) => item.id === id);
		if (byId) return byId;
	}
	if (!value) return undefined;
	return items.find((item) => itemValue(item) === value);
}

function optionOf(item: TStatusItem, kind: 'status' | 'priority'): TaskPropertyMenuOption<string | null> {
	const value = itemValue(item);
	return {
		key: `${kind}:${item.id ?? value}`,
		value,
		label: itemLabel(item, value),
		icon: item.icon ?? <TaskPropertyIcon kind={kind} name={value} color={item.bgColor} />
	};
}

export interface ChatTaskCardProps {
	messageId: string;
	taskId: string;
	/** The title the parent knows (the team's list), shown until the task is read. */
	title?: string;
	/** Whether the message is one the platform holds (sent, not deleted): only then can the task be changed from it. */
	canChange: boolean;
	onOpenTask: (taskId: string) => void;
}

/**
 * A task a message shows: its title (opens the task), its status, its priority and its assignees. A reader who may
 * edit tasks changes those three in place, through the message's task card route (the platform's own task update and
 * permissions); the card shows the change at once and reads the task again once it is saved. A change of the task
 * made elsewhere reaches the card through the live channel: `task.updated`, and the `chat_message.updated` the
 * platform tells every conversation showing the task.
 */
function ChatTaskCardComponent({ messageId, taskId, title, canChange, onOpenTask }: Readonly<ChatTaskCardProps>) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const people = useChatPeople();
	const { myPermissions } = useMyRolePermissionsQuery();
	const statusValues = useTaskStatusValue();
	const priorityValues = useTaskPrioritiesValue();
	const listTaskAtom = useMemo(() => selectAtom(tasksByTeamState, (tasks) => tasks.find((task) => task.id === taskId) ?? null), [taskId]);
	const listTask = useAtomValue(listTaskAtom);
	const detailKey = useMemo(() => queryKeys.tasks.detail(taskId), [taskId]);
	const query = useQuery<TTask>({
		queryKey: detailKey,
		queryFn: () => taskService.getTaskById(taskId),
		// The team's list copy has what a card shows: no read for a task the list holds, until something changes it.
		initialData: listTask ?? undefined,
		staleTime: CARD_STALE_MS,
		retry: false,
		// A task the reader cannot open (another team's, a removed one) is not asked for again on every focus.
		refetchOnWindowFocus: false,
		enabled: !!taskId
	});
	const task = query.data ?? listTask ?? null;
	const [pending, setPending] = useState<{ change: CardChange; readAt: number } | null>(null);
	const [missing, setMissing] = useState(cardChangesMissing);
	// A change shows until the task is read again (the platform's answer, or a newer change from elsewhere).
	const shown = pending && pending.readAt === query.dataUpdatedAt ? pending.change : null;

	const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: detailKey, exact: true }), [detailKey, queryClient]);

	// Every conversation showing the task hears its messages changed when the task is changed from a card.
	useRealtimeEvent(CARD_EVENTS, (envelope) => {
		const data = envelope.data as Record<string, unknown> | null;
		if (data?.messageId === messageId) void refresh();
	});

	const statusItems = useMemo(() => Object.values(statusValues) as TStatusItem[], [statusValues]);
	const priorityItems = useMemo(() => Object.values(priorityValues) as TStatusItem[], [priorityValues]);
	const mayEdit = TASK_EDIT_PERMISSIONS.some((permission) => myPermissions.includes(permission));
	const editable = canChange && mayEdit && !missing && !!task;

	const change = useCallback(
		async (input: IChatTaskUpdateInput, display: CardChange) => {
			const readAt = query.dataUpdatedAt;
			setPending((current) => ({ change: { ...(current && current.readAt === readAt ? current.change : {}), ...display }, readAt }));
			try {
				await chatService.updateTask(messageId, taskId, input);
				await refresh();
			} catch (error) {
				setPending(null);
				if (isMissingRouteError(error)) {
					cardChangesMissing = true;
					setMissing(true);
				}
				toast.error(platformMessageOf(error) ?? t('teamChat.TASK_UPDATE_FAILED'));
			}
		},
		[messageId, query.dataUpdatedAt, refresh, t, taskId]
	);

	const statusValue = shown?.status?.value ?? (task?.status as string | undefined) ?? null;
	const statusItem = findItem(statusItems, statusValue, shown?.status ? shown.status.id : (task?.taskStatusId as string | undefined));
	const priorityValue = shown?.priority ? shown.priority.value : ((task?.priority as string | null | undefined) ?? null);
	const priorityItem = priorityValue ? findItem(priorityItems, priorityValue, shown?.priority ? shown.priority.id : (task?.taskPriorityId as string | undefined)) : undefined;
	const shownAssigneeIds = shown?.assigneeIds;
	const assignees: Person[] = useMemo(() => {
		if (shownAssigneeIds) {
			return shownAssigneeIds.map((id) => {
				const person = people.byEmployee.get(id);
				return { id, name: person?.name ?? '', imageUrl: person?.imageUrl };
			});
		}
		return (task?.members ?? []).map(personFromTaskMember);
	}, [people.byEmployee, shownAssigneeIds, task?.members]);
	const assigneeIds = useMemo(() => assignees.map((person) => person.id), [assignees]);

	const statusOptions = useMemo(() => statusItems.map((item) => optionOf(item, 'status')), [statusItems]);
	const priorityOptions = useMemo<TaskPropertyMenuOption<string | null>[]>(
		() => [{ key: 'priority:none', value: null, label: t('teamChat.TASK_NO_PRIORITY') }, ...priorityItems.map((item) => optionOf(item, 'priority'))],
		[priorityItems, t]
	);
	const peopleOptions = useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			people.list.map((person) => ({
				key: person.employeeId,
				value: person.employeeId,
				label: person.name,
				icon: <PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} className="size-4 text-[8px] ring-0" />
			})),
		[people.list]
	);

	const pickStatus = (value: string | null) => {
		if (!value || value === statusValue) return;
		const item = findItem(statusItems, value, null);
		const id = item?.id ?? null;
		void change({ status: value, ...(id ? { taskStatusId: id } : {}) }, { status: { value, id } });
	};
	const pickPriority = (value: string | null) => {
		if (value === priorityValue) return;
		const item = value ? findItem(priorityItems, value, null) : undefined;
		const id = item?.id ?? null;
		void change({ priority: value, taskPriorityId: id }, { priority: { value, id } });
	};
	const toggleAssignee = (employeeId: string) => {
		const next = assigneeIds.includes(employeeId) ? assigneeIds.filter((id) => id !== employeeId) : [...assigneeIds, employeeId];
		void change({ assigneeEmployeeIds: next }, { assigneeIds: next });
	};

	const statusLabel = statusValue ? itemLabel(statusItem, statusValue) : '';
	const priorityLabel = priorityValue ? itemLabel(priorityItem, priorityValue) : t('teamChat.TASK_NO_PRIORITY');
	const statusContent = (
		<>
			<TaskPropertyIcon kind="status" name={statusItem ? itemValue(statusItem) : statusValue} color={statusItem?.bgColor} />
			<span className="min-w-0 truncate capitalize">{statusLabel}</span>
		</>
	);
	const priorityContent = (
		<>
			<TaskPropertyIcon kind="priority" name={priorityItem ? itemValue(priorityItem) : priorityValue} color={priorityItem?.bgColor} />
			<span className={cn('min-w-0 truncate capitalize', !priorityValue && 'text-muted-foreground')}>{priorityLabel}</span>
		</>
	);
	const assigneesContent =
		assignees.length > 0 ? (
			<span className="flex items-center -space-x-1.5 rtl:space-x-reverse">
				{assignees.slice(0, SHOWN_ASSIGNEES).map((person) => (
					<PersonAvatar key={person.id} person={person} className="size-5 text-[9px]" />
				))}
				{assignees.length > SHOWN_ASSIGNEES && <span className="ps-2.5 text-[11px] tabular-nums text-muted-foreground">+{assignees.length - SHOWN_ASSIGNEES}</span>}
			</span>
		) : (
			<span className="text-muted-foreground">{t('teamChat.TASK_UNASSIGNED')}</span>
		);
	const assigneeNames = assignees.map((person) => person.name).filter(Boolean).join(', ');

	return (
		<div className="mt-1.5 flex w-full max-w-md flex-col gap-1.5 rounded-lg bg-card px-2.5 py-2 text-[13px] hairline-ring ring-border" data-task-id={taskId}>
			<button
				type="button"
				onClick={() => onOpenTask(taskId)}
				className="group/task -m-1 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md p-1 text-start outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
					<Task className="size-3.5" />
				</span>
				<span className="min-w-0 flex-1 truncate font-medium text-foreground">{task?.title || title || t('teamChat.TASK_CARD')}</span>
				<span className="shrink-0 text-[11px] text-muted-foreground">{t('teamChat.OPEN_TASK')}</span>
				<ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70 rtl:rotate-180" aria-hidden="true" />
			</button>
			{task && (
				<div className="flex flex-wrap items-center gap-1 ps-8.5" data-testid="chat-task-card-fields">
					{statusValue &&
						(editable && statusOptions.length > 0 ? (
							<TaskPropertyMenu
								options={statusOptions}
								isSelected={(value) => value === statusValue}
								onSelect={pickStatus}
								searchPlaceholder={t(taskPropertySearchKey('status') as DottedLanguageObjectStringPaths)}
								triggerLabel={`${t('teamChat.TASK_STATUS')}: ${statusLabel}`}
								triggerClassName={cn(PILL, PILL_ACTION)}
								optionLabelClassName="capitalize"
								align="start"
							>
								{statusContent}
							</TaskPropertyMenu>
						) : (
							<span className={PILL} title={t('teamChat.TASK_STATUS')}>
								{statusContent}
							</span>
						))}
					{editable && priorityItems.length > 0 ? (
						<TaskPropertyMenu
							options={priorityOptions}
							isSelected={(value) => value === priorityValue}
							onSelect={pickPriority}
							searchPlaceholder={t(taskPropertySearchKey('priority') as DottedLanguageObjectStringPaths)}
							triggerLabel={`${t('teamChat.TASK_PRIORITY')}: ${priorityLabel}`}
							triggerClassName={cn(PILL, PILL_ACTION)}
							optionLabelClassName="capitalize"
							align="start"
						>
							{priorityContent}
						</TaskPropertyMenu>
					) : (
						priorityValue && (
							<span className={PILL} title={t('teamChat.TASK_PRIORITY')}>
								{priorityContent}
							</span>
						)
					)}
					{editable && peopleOptions.length > 0 ? (
						<TaskPropertyMenu
							options={peopleOptions}
							isSelected={(value) => assigneeIds.includes(value)}
							onSelect={toggleAssignee}
							multiple
							searchPlaceholder={t('taskDetail.properties.SEARCH_PEOPLE')}
							triggerLabel={assigneeNames ? `${t('teamChat.TASK_ASSIGNEES')}: ${assigneeNames}` : t('teamChat.TASK_ASSIGNEES')}
							triggerClassName={cn(PILL, PILL_ACTION)}
							popupClassName="w-64"
							align="start"
						>
							{assigneesContent}
						</TaskPropertyMenu>
					) : (
						assignees.length > 0 && (
							<span className={PILL} title={assigneeNames || t('teamChat.TASK_ASSIGNEES')}>
								{assigneesContent}
							</span>
						)
					)}
				</div>
			)}
		</div>
	);
}

export const ChatTaskCard = memo(ChatTaskCardComponent);
