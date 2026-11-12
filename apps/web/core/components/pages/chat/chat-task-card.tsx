'use client';

import { memo, useCallback, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
import { useInvalidateTeamTasks } from '@/core/hooks/organizations/teams/use-invalidate-team-tasks';
import { useRealtimeEvent } from '@/core/hooks/realtime/use-realtime-event';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskStatusValue } from '@/core/hooks/tasks/use-task-status';
import { REALTIME_EVENT_NAMES } from '@/core/lib/realtime/events';
import { cn } from '@/core/lib/helpers';
import type { ChatPerson } from '@/core/lib/utils/chat-format';
import { isMissingRouteError, platformMessageOf } from '@/core/lib/utils/chat-errors';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { taskService } from '@/core/services/client/api/tasks/task.service';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import type { TStatusItem } from '@/core/types/interfaces/task/task-card';
import type { IChatTaskUpdateInput } from '@/core/types/interfaces/common/chat';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** How long a card trusts a task it read itself (the live channel's `task.updated` reads it sooner). */
const CARD_STALE_MS = 5 * 60_000;

/** How many assignees a card shows as faces before "+N". */
const SHOWN_ASSIGNEES = 3;

/** The permissions that let a reader change a task (the platform asks for one of them as well). */
const TASK_EDIT_PERMISSIONS = ['ORG_TASK_EDIT', 'ALL_ORG_EDIT'];

const CARD_EVENTS: readonly string[] = [REALTIME_EVENT_NAMES.CHAT_MESSAGE_UPDATED];

const PILL =
	'inline-flex h-6 max-w-44 min-w-0 items-center gap-1.5 rounded-md bg-foreground/[0.04] px-1.5 text-xs text-foreground transition-colors';
const PILL_ACTION = cn(PILL, 'hover:bg-foreground/[0.08] data-[popup-open]:bg-foreground/[0.08]');

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

function useCardChangesMissing(): boolean {
	return useSyncExternalStore(
		subscribeToMissing,
		() => cardChangesMissing,
		() => false
	);
}

// ---------------------------------------------------------------- what a card shows

/** What the card shows of a change while the platform takes it: until the task is read again. */
interface CardChange {
	status?: { value: string; id: string | null };
	priority?: { value: string | null; id: string | null };
	assigneeIds?: string[];
}

/** A status or a priority as the card shows it: its value, its record among the options, its words. */
interface PropertyView {
	value: string | null;
	item: TStatusItem | undefined;
	label: string;
}

function itemValue(item: TStatusItem): string {
	return String(item.value ?? item.name ?? '');
}

function itemLabel(item: TStatusItem | undefined, fallback: string): string {
	return item?.realName || item?.name || fallback.split('-').join(' ');
}

function findItem(items: readonly TStatusItem[], value: string | null, id: string | null): TStatusItem | undefined {
	const byId = id ? items.find((item) => item.id === id) : undefined;
	if (byId || !value) return byId;
	return items.find((item) => itemValue(item) === value);
}

function textOrNull(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

/** A status or a priority: the change on its way when there is one, else the task's own. */
function propertyView(
	items: readonly TStatusItem[],
	pending: { value: string | null; id: string | null } | undefined,
	own: { value: unknown; id: unknown },
	emptyLabel: string
): PropertyView {
	const value = pending ? pending.value : textOrNull(own.value);
	const id = pending ? pending.id : textOrNull(own.id);
	const item = value ? findItem(items, value, id) : undefined;
	return { value, item, label: value ? itemLabel(item, value) : emptyLabel };
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

/** The assignees as the card shows them: the change on its way, or the task's members. */
function assigneesOf(task: TTask | null, pendingIds: readonly string[] | undefined, people: ReadonlyMap<string, ChatPerson>): Person[] {
	if (!pendingIds) return (task?.members ?? []).map(personFromTaskMember);
	return pendingIds.map((id) => {
		const person = people.get(id);
		return { id, name: person?.name ?? '', imageUrl: person?.imageUrl };
	});
}

// ---------------------------------------------------------------- reading and changing the task

/**
 * The task a card shows: the team's list copy when the list holds it (no read for the card), otherwise the task read
 * once through the shared detail query (the full task, as the task drawer reads it). Whether the list holds it also
 * says whether the active team's statuses and priorities are the task's own.
 */
function useCardTask(taskId: string): { task: TTask | null; inTeamList: boolean } {
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
function useCardChanges(messageId: string, taskId: string, task: TTask | null) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { invalidateTeamTasksData } = useInvalidateTeamTasks();
	const [pending, setPending] = useState<{ change: CardChange; base: TTask | null } | null>(null);
	const queue = useRef<Promise<void>>(Promise.resolve());
	const inFlight = useRef(0);
	// A change shows until the task is read again: a new copy of it is the platform's answer, or a newer change.
	const shown = pending && pending.base === task ? pending.change : null;

	const change = useCallback(
		(input: IChatTaskUpdateInput, display: CardChange) => {
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

// ---------------------------------------------------------------- the card's parts

function PropertyField({
	kind,
	view,
	items,
	editable,
	label,
	options,
	onPick
}: Readonly<{
	kind: 'status' | 'priority';
	view: PropertyView;
	items: readonly TStatusItem[];
	editable: boolean;
	label: string;
	options: TaskPropertyMenuOption<string | null>[];
	onPick: (value: string | null) => void;
}>) {
	const t = useTranslations();
	const glyph = view.item ? itemValue(view.item) : view.value;
	const content = (
		<>
			<TaskPropertyIcon kind={kind} name={glyph} color={view.item?.bgColor} />
			<span className={cn('min-w-0 truncate capitalize', !view.value && 'text-muted-foreground')}>{view.label}</span>
		</>
	);
	if (!editable || !items.length) {
		return view.value ? (
			<span className={PILL} title={label}>
				{content}
			</span>
		) : null;
	}
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => value === view.value}
			onSelect={onPick}
			searchPlaceholder={t(taskPropertySearchKey(kind) as DottedLanguageObjectStringPaths)}
			triggerLabel={`${label}: ${view.label}`}
			triggerClassName={PILL_ACTION}
			optionLabelClassName="capitalize"
			align="start"
		>
			{content}
		</TaskPropertyMenu>
	);
}

function AssigneesField({
	assignees,
	people,
	editable,
	onToggle
}: Readonly<{ assignees: readonly Person[]; people: readonly ChatPerson[]; editable: boolean; onToggle: (employeeId: string) => void }>) {
	const t = useTranslations();
	const ids = new Set(assignees.map((person) => person.id));
	const names = assignees
		.map((person) => person.name)
		.filter(Boolean)
		.join(', ');
	const options = useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			people.map((person) => ({
				key: person.employeeId,
				value: person.employeeId,
				label: person.name,
				icon: <PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} className="size-4 text-[8px] ring-0" />
			})),
		[people]
	);
	let content: ReactNode = <span className="text-muted-foreground">{t('teamChat.TASK_UNASSIGNED')}</span>;
	if (assignees.length) {
		content = (
			<span className="flex items-center -space-x-1.5 rtl:space-x-reverse">
				{assignees.slice(0, SHOWN_ASSIGNEES).map((person) => (
					<PersonAvatar key={person.id} person={person} className="size-5 text-[9px]" />
				))}
				{assignees.length > SHOWN_ASSIGNEES && <span className="ps-2.5 text-[11px] tabular-nums text-muted-foreground">+{assignees.length - SHOWN_ASSIGNEES}</span>}
			</span>
		);
	}
	if (!editable || !options.length) {
		return assignees.length ? (
			<span className={PILL} title={names || t('teamChat.TASK_ASSIGNEES')}>
				{content}
			</span>
		) : null;
	}
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => ids.has(value)}
			onSelect={onToggle}
			multiple
			searchPlaceholder={t('taskDetail.properties.SEARCH_PEOPLE')}
			triggerLabel={names ? `${t('teamChat.TASK_ASSIGNEES')}: ${names}` : t('teamChat.TASK_ASSIGNEES')}
			triggerClassName={PILL_ACTION}
			popupClassName="w-64"
			align="start"
		>
			{content}
		</TaskPropertyMenu>
	);
}

// ---------------------------------------------------------------- the card

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
 * edit tasks changes those in place, through the message's task card route (the platform's own task update and
 * permissions). The status and the priority are offered from the active team's lists only for a task of that team;
 * another team's task keeps them read-only (its own statuses are not the ones loaded here).
 */
function ChatTaskCardComponent({ messageId, taskId, title, canChange, onOpenTask }: Readonly<ChatTaskCardProps>) {
	const t = useTranslations();
	const people = useChatPeople();
	const { myPermissions } = useMyRolePermissionsQuery();
	const statusValues = useTaskStatusValue();
	const priorityValues = useTaskPrioritiesValue();
	const missing = useCardChangesMissing();
	const { task, inTeamList } = useCardTask(taskId);
	const { shown, change } = useCardChanges(messageId, taskId, task);

	const statusItems = useMemo(() => Object.values(statusValues) as TStatusItem[], [statusValues]);
	const priorityItems = useMemo(() => Object.values(priorityValues) as TStatusItem[], [priorityValues]);
	const statusOptions = useMemo(() => statusItems.map((item) => optionOf(item, 'status')), [statusItems]);
	const priorityOptions = useMemo<TaskPropertyMenuOption<string | null>[]>(
		() => [{ key: 'priority:none', value: null, label: t('teamChat.TASK_NO_PRIORITY') }, ...priorityItems.map((item) => optionOf(item, 'priority'))],
		[priorityItems, t]
	);

	const editable = canChange && !missing && !!task && TASK_EDIT_PERMISSIONS.some((permission) => myPermissions.includes(permission));
	const status = propertyView(statusItems, shown?.status, { value: task?.status, id: task?.taskStatusId }, '');
	const priority = propertyView(priorityItems, shown?.priority, { value: task?.priority, id: task?.taskPriorityId }, t('teamChat.TASK_NO_PRIORITY'));
	const assignees = assigneesOf(task, shown?.assigneeIds, people.byEmployee);

	const pickStatus = (value: string | null) => {
		if (!value || value === status.value) return;
		const id = findItem(statusItems, value, null)?.id ?? null;
		change({ status: value, ...(id ? { taskStatusId: id } : {}) }, { status: { value, id } });
	};
	const pickPriority = (value: string | null) => {
		if (value === priority.value) return;
		const id = (value && findItem(priorityItems, value, null)?.id) || null;
		change({ priority: value, taskPriorityId: id }, { priority: { value, id } });
	};
	const toggleAssignee = (employeeId: string) => {
		const ids = assignees.map((person) => person.id);
		const next = ids.includes(employeeId) ? ids.filter((id) => id !== employeeId) : [...ids, employeeId];
		change({ assigneeEmployeeIds: next }, { assigneeIds: next });
	};

	return (
		<div className="mt-1.5 flex w-full max-w-md flex-col gap-1.5 rounded-lg bg-card px-2.5 py-2 text-[13px] hairline-ring ring-border" data-task-id={taskId}>
			<button
				type="button"
				onClick={() => onOpenTask(taskId)}
				className="-m-1 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md p-1 text-start outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
					{status.value && (
						<PropertyField kind="status" view={status} items={statusItems} editable={editable && inTeamList} label={t('teamChat.TASK_STATUS')} options={statusOptions} onPick={pickStatus} />
					)}
					<PropertyField kind="priority" view={priority} items={priorityItems} editable={editable && inTeamList} label={t('teamChat.TASK_PRIORITY')} options={priorityOptions} onPick={pickPriority} />
					<AssigneesField assignees={assignees} people={people.list} editable={editable} onToggle={toggleAssignee} />
				</div>
			)}
		</div>
	);
}

export const ChatTaskCard = memo(ChatTaskCardComponent);
