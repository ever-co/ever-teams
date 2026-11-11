'use client';

import { type DragEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Archive, Spinner } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { useChatActions, ChatOutboxMessage } from '@/core/hooks/chat/use-chat-actions';
import { useChatAttachments } from '@/core/hooks/chat/use-chat-attachments';
import { useChatDraft } from '@/core/hooks/chat/use-chat-draft';
import { useChatFiles } from '@/core/hooks/chat/use-chat-files';
import { useChatMessages } from '@/core/hooks/chat/use-chat-messages';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { attachmentFallbackBody, filesOfTransfer, isFileDrag } from '@/core/lib/utils/chat-attachments';
import { ChatPerson, conversationTitle } from '@/core/lib/utils/chat-format';
import { ChatReadPosition, ChatTimelineItem, dayLabel, timelineItems } from '@/core/lib/utils/chat-timeline';
import { isChatVirtualListEnabled } from '@/core/lib/utils/chat-enabled';
import { cn } from '@/core/lib/helpers';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { EChatNotifyLevel, IChatConversationWithState, IChatFile, IChatMessage } from '@/core/types/interfaces/common/chat';
import type { ETimerStatus } from '@/core/types/generics/enums/timer';
import { ConversationFilesButton, ImageLightbox } from './chat-attachments';
import { ChatErrorState, ChatMessagesSkeleton } from './chat-states';
import { VirtualTimeline, type VirtualTimelineHandle } from './chat-virtual-timeline';
import { ConversationWelcome, DayDivider, JumpToLatest, NewDivider } from './chat-timeline-parts';
import { BAR_BUTTON, ConversationHeader } from './conversation-header';
import { CreateTaskFromMessageDialog } from './create-task-dialog';
import { MessageComposer } from './message-composer';
import { MessageItem } from './message-item';

export interface ConversationViewProps {
	conversation: IChatConversationWithState;
	conversationNames: ReadonlyMap<string, string>;
	canManage: boolean;
	/** The status dot of each person the app knows, by employee id. */
	presence?: ReadonlyMap<string, ETimerStatus>;
	onOpenThread: (rootMessageId: string) => void;
	onBack?: () => void;
	/** `?m=` — the message to scroll to once loaded. */
	jumpToMessageId?: string | null;
}

/** Closer to the newest message than this, the reader is at the bottom: the timeline follows new messages and reads them. */
const AT_BOTTOM_PX = 40;
/** Further up than this, "Jump to latest" shows even when nothing new arrived. */
const FAR_FROM_BOTTOM_PX = 480;
/** A jump over more than this is not animated: a long smooth scroll is a wait. */
const SMOOTH_SCROLL_MAX_PX = 2400;
/** Frames a jump waits for the virtual list to draw its target before it gives up on lighting it. */
const JUMP_FRAMES = 8;

/**
 * Where the reader had got to when they opened the conversation, when it holds something they have not read: the
 * "New" line stands right after it. A conversation opened fully read has none.
 */
function openedPosition(conversation: IChatConversationWithState): ChatReadPosition | null {
	const state = conversation.state;
	if (!state || !((state.unreadCount ?? 0) > 0 || (state.mentionCount ?? 0) > 0)) return null;
	return { lastReadMessageId: state.lastReadMessageId, lastReadAt: state.lastReadAt };
}

/** The middle pane: the header, the timeline (older pages above, newest at the bottom) and the composer. */
export function ConversationView(props: Readonly<ConversationViewProps>) {
	// Everything the pane remembers belongs to one conversation (where the reader was, what they are editing, the
	// "New" line): opening another one starts the pane afresh.
	return <ConversationPane key={props.conversation.id} {...props} />;
}

function ConversationPane({ conversation, conversationNames, canManage, presence, onOpenThread, onBack, jumpToMessageId }: Readonly<ConversationViewProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const scope = useChatScope();
	const people = useChatPeople();
	const actions = useChatActions();
	const { openTaskDrawer } = useTaskDrawer();
	const tasks = useAtomValue(tasksByTeamState);
	const taskTitles = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
	const { messages, hasBefore, isLoading, isError, isLoadingOlder, loadOlder, retry, newestId, jumpTo } = useChatMessages(conversation.id, true);
	const { draft, setDraft, clearDraft } = useChatDraft(conversation.id);
	const attachments = useChatAttachments();
	const files = useChatFiles(conversation.id, messages);
	// By id: the lightbox shows the newest copy of the record (its signed address is read again with the list).
	const [pictureId, setPictureId] = useState<string | null>(null);
	const picture = pictureId ? (files.byId.get(pictureId) ?? null) : null;
	// A drag of files over the timeline: dropped, they join the message being written.
	const [dropping, setDropping] = useState(false);
	const [editing, setEditing] = useState<IChatMessage | null>(null);
	const [editValue, setEditValue] = useState('');
	const [taskFrom, setTaskFrom] = useState<IChatMessage | null>(null);
	const list = useRef<HTMLDivElement | null>(null);
	const content = useRef<HTMLDivElement | null>(null);
	// The virtual list (behind its flag), read once: switching it mid-conversation would lose the reader's place.
	const [virtual] = useState(isChatVirtualListEnabled);
	const virtualTimeline = useRef<VirtualTimelineHandle | null>(null);
	// A jump to a message the virtual list has not drawn: it scrolls there, and the target is looked for again a frame on.
	const [jumpFrame, setJumpFrame] = useState(0);
	const jumpTries = useRef(0);
	const jumpTarget = useRef<string | null>(null);
	const stickToBottom = useRef(true);
	// How far the reader is from the newest message. Only at the bottom does viewing read the conversation.
	const [away, setAway] = useState<'bottom' | 'near' | 'far'>('bottom');
	const atBottom = away === 'bottom';
	// The newest message when the reader left the bottom: what arrived after it is counted on "Jump to latest".
	const [leftAt, setLeftAt] = useState<string | null>(null);
	// The reader's last read position as they opened the conversation: the "New" line stays there until they leave.
	const [opened, setOpened] = useState(() => openedPosition(conversation));
	// "5 minutes ago" and "Today" stay true while the pane is open.
	const [now, setNow] = useState(() => Date.now());
	// The composer takes the focus on a device with a keyboard; on a phone that would open the keyboard over the messages.
	const [focusComposer] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
	// "Mark unread from here" pauses the automatic read until the reader sends a message or opens another conversation.
	const readPaused = useRef(false);
	const jumped = useRef<string | null>(null);
	const jumpRequested = useRef<string | null>(null);
	const meEmployeeId = scope?.employeeId ?? null;
	const meUserId = scope?.userId ?? null;
	const title = conversationTitle(conversation, people.byEmployee, meEmployeeId, t('teamChat.UNNAMED')).replace(/^#/, '');
	const archived = !!conversation.archivedAt;
	const reportFailure = useCallback(() => toast.error(t('teamChat.UPDATE_FAILED')), [t]);

	const items = useMemo(() => timelineItems(messages, opened ? { ...opened, meUserId } : null), [meUserId, messages, opened]);
	const today = useMemo(() => new Date(now), [now]);
	const newBelow = useMemo(() => {
		if (atBottom || !leftAt) return 0;
		const from = messages.findIndex((message) => message.id === leftAt);
		if (from === -1) return 0;
		return messages.slice(from + 1).filter((message) => !(meUserId && String(message.authorUserId ?? '') === String(meUserId))).length;
	}, [atBottom, leftAt, meUserId, messages]);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 60_000);
		return () => window.clearInterval(timer);
	}, []);

	// A link to a message outside what is loaded: the page around it is read once.
	useEffect(() => {
		if (!jumpToMessageId || isLoading || jumpRequested.current === jumpToMessageId) return;
		if (messages.some((message) => message.id === jumpToMessageId)) return;
		jumpRequested.current = jumpToMessageId;
		stickToBottom.current = false;
		void jumpTo(jumpToMessageId).catch(() => undefined);
	}, [isLoading, jumpTo, jumpToMessageId, messages]);

	// The newest message stays in view while the reader is at the bottom; a jump target scrolls into view once and is
	// lit for a moment. Before the paint, so a new message never shows half out of view first.
	useLayoutEffect(() => {
		const element = list.current;
		if (!element) return;
		if (jumpToMessageId && jumped.current !== jumpToMessageId) {
			// Each target gets its own frames: one that was never drawn does not use up the next one's.
			if (jumpTarget.current !== jumpToMessageId) {
				jumpTarget.current = jumpToMessageId;
				jumpTries.current = 0;
			}
			const target = element.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(jumpToMessageId)}"]`);
			if (target) {
				jumped.current = jumpToMessageId;
				stickToBottom.current = false;
				target.scrollIntoView({ block: 'center' });
				target.dataset.highlight = 'true';
				window.setTimeout(() => delete target.dataset.highlight, 2000);
				jumpTries.current = 0;
				return;
			}
			if (virtual && jumpTries.current < JUMP_FRAMES && virtualTimeline.current?.scrollToMessage(jumpToMessageId)) {
				jumpTries.current += 1;
				stickToBottom.current = false;
				const frame = window.requestAnimationFrame(() => setJumpFrame((count) => count + 1));
				return () => window.cancelAnimationFrame(frame);
			}
		}
		if (stickToBottom.current) element.scrollTop = element.scrollHeight;
	}, [newestId, jumpToMessageId, messages.length, isLoading, virtual, jumpFrame]);

	// At the bottom the timeline stays there when its height changes without a new message: the composer growing a
	// line, the thread pane opening beside it, an edited message getting longer.
	useEffect(() => {
		const element = list.current;
		const inner = content.current;
		if (!element || !inner || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			if (stickToBottom.current) element.scrollTop = element.scrollHeight;
		});
		observer.observe(element);
		observer.observe(inner);
		return () => observer.disconnect();
	}, []);

	// Viewing the conversation reads it — once its first page is there and whenever something new arrives — but only
	// while the reader is at the bottom (what they have reached), and not after they marked it unread.
	useEffect(() => {
		if (!newestId || !conversation.state || !atBottom || readPaused.current) return;
		if ((conversation.state.unreadCount ?? 0) > 0 || (conversation.state.mentionCount ?? 0) > 0) {
			actions.read(conversation.id).catch(() => undefined);
		}
	}, [actions, atBottom, conversation.id, conversation.state, newestId]);

	const onScroll = useCallback(() => {
		const element = list.current;
		if (!element) return;
		const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
		const wasAtBottom = stickToBottom.current;
		stickToBottom.current = distance < AT_BOTTOM_PX;
		if (stickToBottom.current) {
			setAway('bottom');
			setLeftAt(null);
		} else {
			setAway(distance < FAR_FROM_BOTTOM_PX ? 'near' : 'far');
			if (wasAtBottom) setLeftAt(newestId);
		}
		if (element.scrollTop < 80 && hasBefore && !isLoadingOlder) {
			const before = element.scrollHeight;
			// The virtual list measures the rows it draws as the page comes in: it puts the reader's row back itself.
			const anchor = virtual ? (virtualTimeline.current?.anchor() ?? null) : null;
			void loadOlder().then(() => {
				// Keep what the reader was looking at in place after the older page is prepended.
				requestAnimationFrame(() => {
					if (anchor && virtualTimeline.current?.restore(anchor)) return;
					if (list.current) list.current.scrollTop += list.current.scrollHeight - before;
				});
			});
		}
	}, [hasBefore, isLoadingOlder, loadOlder, newestId, virtual]);

	const jumpToLatest = useCallback(() => {
		const element = list.current;
		if (!element) return;
		const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
		const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		stickToBottom.current = true;
		element.scrollTo({ top: element.scrollHeight, behavior: calm || distance > SMOOTH_SCROLL_MAX_PX ? 'auto' : 'smooth' });
	}, []);

	const send = useCallback(
		async (body: string) => {
			const attachmentIds = attachments.readyIds;
			const ready = new Set(attachmentIds);
			const names = attachments.items.filter((item) => item.documentId && ready.has(item.documentId)).map((item) => item.name);
			clearDraft();
			attachments.releaseSent();
			stickToBottom.current = true;
			readPaused.current = false;
			await actions
				.send(conversation.id, { body: body || attachmentFallbackBody(names), attachmentIds: attachmentIds.length ? attachmentIds : undefined })
				.catch(() => toast.error(t('teamChat.SEND_FAILED')));
		},
		[actions, attachments, clearDraft, conversation.id, t]
	);

	const canDrop = attachments.canAttach && !conversation.archivedAt;
	const onDragOver = (event: DragEvent<HTMLDivElement>) => {
		if (!canDrop || !isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		if (!dropping) setDropping(true);
	};
	const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
		if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
		setDropping(false);
	};
	const onDrop = (event: DragEvent<HTMLDivElement>) => {
		if (!canDrop || !isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		setDropping(false);
		attachments.add(filesOfTransfer(event.dataTransfer));
	};

	const saveEdit = useCallback(
		async (body: string) => {
			if (!editing) return;
			try {
				await actions.edit(editing, body);
				setEditing(null);
			} catch {
				reportFailure();
			}
		},
		[actions, editing, reportFailure]
	);

	const handlers = useMemo(
		() => ({
			onReact: (message: IChatMessage, emoji: string) => actions.react(message, emoji).catch(reportFailure),
			onReply: (message: IChatMessage) => onOpenThread(message.threadRootId ?? message.id),
			onEdit: (message: IChatMessage) => {
				setEditing(message);
				setEditValue(message.body);
			},
			onDelete: (message: IChatMessage) => actions.remove(message).catch(reportFailure),
			onPin: (message: IChatMessage, pinned: boolean) => actions.pin(message, pinned).catch(reportFailure),
			onUnreadFrom: (message: IChatMessage) => {
				readPaused.current = true;
				actions
					.unreadFrom(message)
					.then(() => {
						// The "New" line moves to where the reader asked: right above this message.
						setOpened({ lastReadMessageId: null, lastReadAt: new Date(Date.parse(message.createdAt) - 1).toISOString() });
						toast(t('teamChat.MARKED_UNREAD'));
					})
					.catch(reportFailure);
			},
			onRetry: (message: ChatOutboxMessage) => actions.retry(conversation.id, message).catch(() => toast.error(t('teamChat.SEND_FAILED'))),
			onDiscard: (message: ChatOutboxMessage) => actions.discardFailed(conversation.id, message),
			onCopyLink: (message: IChatMessage) => {
				const url = `${window.location.origin}/chat/${conversation.id}?m=${message.id}`;
				navigator.clipboard?.writeText(url).then(() => toast(t('teamChat.LINK_COPIED'))).catch(() => undefined);
			},
			onOpenTask: (taskId: string) => openTaskDrawer(taskId),
			onCreateTask: (message: IChatMessage) => setTaskFrom(message),
			onOpenImage: (file: IChatFile) => setPictureId(String(file.documentId)),
			onBrokenImage: files.refresh
		}),
		[actions, conversation.id, files.refresh, onOpenThread, openTaskDrawer, reportFailure, t]
	);

	const setNotify = (level: EChatNotifyLevel) => actions.setMemberState(conversation.id, { notifyLevel: level }).catch(reportFailure);
	const toggleFavorite = () => actions.setMemberState(conversation.id, { isFavorite: !conversation.state?.isFavorite }).catch(reportFailure);
	const copyLink = () => {
		navigator.clipboard?.writeText(`${window.location.origin}/chat/${conversation.id}`).then(() => toast(t('teamChat.LINK_COPIED'))).catch(() => undefined);
	};
	const leave = () =>
		actions
			.leave(conversation.id)
			.then(() => router.push('/chat'))
			.catch(reportFailure);

	/** One row of the timeline: a day, the "New" line, a message (or its edit). */
	const renderItem = (item: ChatTimelineItem) => {
		if (item.type === 'day') return <DayDivider key={`day:${item.key}`} label={dayLabel(item.date, locale, today)} />;
		if (item.type === 'new') return <NewDivider key="new" label={t('teamChat.NEW_DIVIDER')} />;
		const { message } = item;
		if (editing?.id === message.id) {
			return (
				<div key={message.id} className="px-4 py-2">
					<MessageComposer value={editValue} onChange={setEditValue} onSubmit={saveEdit} onCancel={() => setEditing(null)} people={people.list} placeholder={t('teamChat.EDIT')} editing autoFocus />
				</div>
			);
		}
		let author: ChatPerson | null = null;
		if (message.authorEmployeeId) author = people.byEmployee.get(String(message.authorEmployeeId)) ?? null;
		else if (message.authorUserId) author = people.byUser.get(String(message.authorUserId)) ?? null;
		return (
			<MessageItem
				key={message.id}
				message={message}
				author={author}
				people={people.byEmployee}
				conversationNames={conversationNames}
				meEmployeeId={meEmployeeId}
				meUserId={meUserId}
				locale={locale}
				continues={item.continues}
				inTimeline
				canManage={canManage}
				// Only a message with replies words a time ("last reply 5 minutes ago"): the others are not rendered again each minute.
				now={message.replyCount > 0 ? now : undefined}
				taskTitles={taskTitles}
				files={files.byId}
				{...handlers}
			/>
		);
	};

	const isReady = !isLoading && !isError;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ConversationHeader
				conversation={conversation}
				title={title}
				people={people.byEmployee}
				meEmployeeId={meEmployeeId}
				onBack={onBack}
				onToggleFavorite={toggleFavorite}
				onNotify={setNotify}
				onCopyLink={copyLink}
				onLeave={leave}
				presence={presence}
				extra={<ConversationFilesButton conversationId={conversation.id} people={people.byEmployee} peopleByUser={people.byUser} className={BAR_BUTTON} />}
			/>

			<div className="relative min-h-0 flex-1" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
				{dropping && (
					<div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl bg-primary/[0.06] text-sm font-medium text-primary hairline-ring ring-primary/40" aria-hidden="true">
						{t('entityFiles.DROP_HINT')}
					</div>
				)}
				<div ref={list} onScroll={onScroll} className={cn('h-full overflow-y-auto overscroll-contain', virtual && 'relative')} role="log" aria-live="polite" aria-busy={isLoading}>
					{/* Bottom-aligned: a short conversation sits right above the composer, as the next message will. */}
					<div ref={content} className="flex min-h-full flex-col justify-end pb-2">
						{isLoading && <ChatMessagesSkeleton rows={7} />}
						{isError && <ChatErrorState message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={() => retry()} />}
						{isReady && !hasBefore && <ConversationWelcome conversation={conversation} title={title} people={people.byEmployee} meEmployeeId={meEmployeeId} locale={locale} />}
						{isReady && hasBefore && (
							<div className="flex justify-center py-2">
								<Button variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={isLoadingOlder}>
									{isLoadingOlder && <Spinner className="size-3.5 animate-spin" aria-hidden="true" />}
									{t('teamChat.LOAD_OLDER')}
								</Button>
							</div>
						)}
						{isReady && messages.length === 0 && <p className="px-4 pb-2 text-[13px] text-muted-foreground">{t('teamChat.EMPTY_CONVERSATION')}</p>}
						{virtual ? <VirtualTimeline items={items} scrollRef={list} renderItem={renderItem} handleRef={virtualTimeline} /> : items.map(renderItem)}
					</div>
				</div>
				{isReady && (away === 'far' || (away === 'near' && newBelow > 0)) && <JumpToLatest count={newBelow} onClick={jumpToLatest} />}
			</div>

			{/* Above a phone's home indicator: the safe area, when it is taller than the usual space. */}
			<div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
				{archived ? (
					<p className="flex items-center gap-2 rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-xs text-muted-foreground">
						<Archive className="size-4 shrink-0" aria-hidden="true" />
						{t('teamChat.ARCHIVED_NOTICE')}
					</p>
				) : (
					<MessageComposer
						value={draft}
						onChange={setDraft}
						onSubmit={send}
						people={people.list}
						placeholder={t('teamChat.COMPOSER_PLACEHOLDER', { name: title })}
						autoFocus={focusComposer}
						attachments={attachments}
					/>
				)}
			</div>
			{taskFrom && <CreateTaskFromMessageDialog key={taskFrom.id} message={taskFrom} onClose={() => setTaskFrom(null)} />}
			<ImageLightbox file={picture} onClose={() => setPictureId(null)} />
		</div>
	);
}
