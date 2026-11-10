'use client';

import { queryKeys } from '@/core/query/keys';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import { CheckDouble } from '@/core/components/icons';
import { NotificationEmptyState, NotificationErrorState, NotificationRowsSkeleton } from '@/core/components/notifications/inbox/notification-states';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import { useChatBrowse, useChatConversation, useChatConversations, useChatStates, useChatThreads } from '@/core/hooks/chat/use-chat-conversations';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { cn } from '@/core/lib/helpers';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import { conversationTitle, isUnread, plainBody } from '@/core/lib/utils/chat-format';
import { userState } from '@/core/stores/user/user';
import { useAtomValue } from 'jotai';
import { ChatPageSkeleton } from './chat-page-skeleton';
import { BrowseChannelsDialog, NewChannelDialog, NewDirectDialog } from './chat-dialogs';
import { ConversationList } from './conversation-list';
import { ConversationView } from './conversation-view';
import { ThreadPane } from './thread-pane';

export type ChatView = 'conversation' | 'unreads' | 'threads';

/** Whether the signed-in user manages chat (categories, any conversation, any message). */
function useCanManageChat(): boolean {
	const user = useAtomValue(userState);
	const role = String(user?.role?.name ?? '').toUpperCase();
	return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER';
}

/**
 * The live channel just connected: what arrived between the page's first reads and the subscription (the channel only
 * replays from its first connection on) is read again, once per connection.
 */
function useChatLiveCatchUp(): void {
	const queryClient = useQueryClient();
	const live = useAtomValue(realtimeStatusAtom) === 'connected';
	const wasLive = useRef(false);
	useEffect(() => {
		if (live && !wasLive.current) void queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
		wasLive.current = live;
	}, [live, queryClient]);
}

export function ChatPage({ view = 'conversation' }: Readonly<{ view?: ChatView }>) {
	useChatLiveCatchUp();
	return (
		<Suspense fallback={<ChatPageSkeleton />}>
			<ChatPageContent view={view} />
		</Suspense>
	);
}

/**
 * The chat page: the conversation list, the open conversation (or the Unreads / Threads view) and, when
 * `?thread=` names a root, the thread pane. Behind `NEXT_PUBLIC_CHAT_ENABLED`.
 */
function ChatPageContent({ view }: Readonly<{ view: ChatView }>) {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const params = useParams<{ conversationId?: string }>();
	const searchParams = useSearchParams();
	const enabled = isChatEnabled();
	const scope = useChatScope();
	const people = useChatPeople();
	const actions = useChatActions();
	const canManage = useCanManageChat();

	useEffect(() => {
		if (!enabled) router.replace('/');
	}, [enabled, router]);

	const conversationId = view === 'conversation' ? (params?.conversationId ?? null) : null;
	const threadId = searchParams.get('thread');
	const jumpTo = searchParams.get('m');
	const list = useChatConversations(enabled);
	const known = conversationId ? (list.byId.get(conversationId) ?? null) : null;
	const current = useChatConversation(conversationId, known, enabled);
	const threads = useChatThreads(enabled && view === 'threads');
	const browse = useChatBrowse(enabled);
	const [dialog, setDialog] = useState<'channel' | 'direct' | 'browse' | null>(null);
	const [listOpen, setListOpen] = useState(!conversationId);
	// Opening a conversation closes the list on narrow screens: adjusted while rendering, not in an effect.
	const [listFor, setListFor] = useState(conversationId);
	if (listFor !== conversationId) {
		setListFor(conversationId);
		if (conversationId) setListOpen(false);
	}

	const conversationNames = useMemo(() => new Map(list.conversations.map((c) => [c.id, c.name ?? ''])), [list.conversations]);
	const { threadsUnread } = useChatStates(enabled);
	const reportFailure = useCallback(() => toast.error(t('teamChat.UPDATE_FAILED')), [t]);

	// The last conversation opened comes back on `/chat`; without one, the first of the list opens.
	useEffect(() => {
		if (view !== 'conversation' || conversationId || !list.conversations.length) return;
		let remembered: string | null = null;
		try {
			remembered = window.localStorage.getItem('chat-last-conversation');
		} catch {
			remembered = null;
		}
		const target = (remembered && list.byId.get(remembered)) || list.conversations[0];
		if (target) router.replace(`/chat/${target.id}`);
	}, [conversationId, list.byId, list.conversations, router, view]);

	useEffect(() => {
		if (!conversationId) return;
		try {
			window.localStorage.setItem('chat-last-conversation', conversationId);
		} catch {
			// Storage can be blocked.
		}
	}, [conversationId]);

	const openThread = useCallback(
		(rootMessageId: string) => {
			const next = new URLSearchParams(searchParams.toString());
			next.set('thread', rootMessageId);
			next.delete('m');
			router.replace(`${pathname}?${next.toString()}`);
		},
		[pathname, router, searchParams]
	);

	const closeThread = useCallback(() => {
		const next = new URLSearchParams(searchParams.toString());
		next.delete('thread');
		const search = next.toString();
		router.replace(search ? `${pathname}?${search}` : pathname);
	}, [pathname, router, searchParams]);

	const markAllRead = useCallback(() => {
		actions
			.readAll()
			.then(({ undo }) => toast(t('teamChat.ALL_READ'), { action: { label: t('teamChat.UNDO'), onClick: () => undo().catch(reportFailure) } }))
			.catch(reportFailure);
	}, [actions, reportFailure, t]);

	// Shift+Escape marks everything read, anywhere on the page.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && event.shiftKey) {
				event.preventDefault();
				markAllRead();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [markAllRead]);

	if (!enabled) return <ChatPageSkeleton />;

	const unreadList = list.conversations.filter(isUnread);
	const meEmployeeId = scope?.employeeId ?? null;

	return (
		<PageLayout fill title={t('teamChat.TITLE')} className="p-0">
			<div className="flex h-full min-h-0">
				<aside className={cn('w-full shrink-0 border-r border-border lg:block lg:w-64', listOpen ? 'block' : 'hidden')}>
					{list.isLoading && <NotificationRowsSkeleton rows={6} />}
					{list.isError && <NotificationErrorState message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={() => list.retry()} />}
					{!list.isLoading && !list.isError && (
						<ConversationList
							conversations={list.conversations}
							categories={list.categories}
							people={people.byEmployee}
							meEmployeeId={meEmployeeId}
							currentId={conversationId}
							view={view}
							unreadCount={list.unreadCount}
							threadsUnread={threadsUnread}
							onNewChannel={() => setDialog('channel')}
							onNewDirect={() => setDialog('direct')}
							onBrowse={() => setDialog('browse')}
						/>
					)}
				</aside>

				<main className={cn('min-w-0 flex-1', listOpen && 'hidden lg:block')}>
					{view === 'conversation' && current.conversation && (
						<ConversationView
							conversation={current.conversation}
							conversationNames={conversationNames}
							canManage={canManage}
							onOpenThread={openThread}
							onBack={() => setListOpen(true)}
							jumpToMessageId={threadId ? null : jumpTo}
						/>
					)}
					{view === 'conversation' && !current.conversation && (current.isLoading || list.isLoading) && <NotificationRowsSkeleton rows={8} />}
					{view === 'conversation' && !current.conversation && !current.isLoading && !list.isLoading && (
						<NotificationEmptyState icon={<span className="text-xl">💬</span>} title={conversationId ? t('teamChat.NOT_AVAILABLE_TITLE') : t('teamChat.PICK_TITLE')} message={conversationId ? t('teamChat.NOT_AVAILABLE_TEXT') : t('teamChat.PICK_TEXT')} />
					)}
					{view === 'unreads' && (
						<section className="flex h-full flex-col">
							<header className="flex items-center gap-2 border-b border-border px-4 py-2">
								<h1 className="flex-1 text-sm font-semibold">{t('teamChat.UNREADS')}</h1>
								<Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadList.length === 0}>
									<CheckDouble className="size-4" /> {t('teamChat.MARK_ALL_READ')}
								</Button>
							</header>
							<div className="min-h-0 flex-1 overflow-y-auto p-2">
								{unreadList.length === 0 && <NotificationEmptyState icon={<CheckDouble />} title={t('teamChat.NO_UNREADS_TITLE')} message={t('teamChat.NO_UNREADS_TEXT')} />}
								{unreadList.map((conversation) => (
									<Link key={conversation.id} href={`/chat/${conversation.id}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] hover:bg-foreground/[0.04]">
										<span className="min-w-0 flex-1 truncate font-medium text-foreground">{conversationTitle(conversation, people.byEmployee, meEmployeeId, t('teamChat.UNNAMED'))}</span>
										<span className="text-xs tabular-nums text-muted-foreground">{t('teamChat.UNREAD_COUNT', { count: conversation.state?.unreadCount ?? 0 })}</span>
										{(conversation.state?.mentionCount ?? 0) > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{conversation.state?.mentionCount}</span>}
									</Link>
								))}
							</div>
						</section>
					)}
					{view === 'threads' && (
						<section className="flex h-full flex-col">
							<header className="flex items-center gap-2 border-b border-border px-4 py-2">
								<h1 className="flex-1 text-sm font-semibold">{t('teamChat.THREADS')}</h1>
							</header>
							<div className="min-h-0 flex-1 overflow-y-auto p-2">
								{threads.isLoading && <NotificationRowsSkeleton rows={4} />}
								{!threads.isLoading && threads.threads.length === 0 && <NotificationEmptyState icon={<span className="text-xl">🧵</span>} title={t('teamChat.NO_THREADS_TITLE')} message={t('teamChat.NO_THREADS_TEXT')} />}
								{threads.threads.map((root) => (
									<Link key={root.id} href={`/chat/${root.conversationId}?thread=${root.id}`} className="flex flex-col gap-0.5 rounded-md px-3 py-2 text-[13px] hover:bg-foreground/[0.04]">
										<span className="flex items-center gap-2">
											<span className="min-w-0 flex-1 truncate text-muted-foreground">{conversationNames.get(root.conversationId) ? `#${conversationNames.get(root.conversationId)}` : t('teamChat.THREAD')}</span>
											{root.unreadReplies > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{root.unreadReplies}</span>}
										</span>
										<span className="truncate text-foreground">{plainBody(root.body, people.byEmployee, conversationNames) || t('teamChat.DELETED')}</span>
										<span className="text-[11px] text-muted-foreground">{t('teamChat.REPLIES', { count: root.replyCount })}</span>
									</Link>
								))}
							</div>
						</section>
					)}
				</main>

				{view === 'conversation' && conversationId && threadId && (
					<aside className="absolute inset-0 z-10 bg-background lg:static lg:z-auto lg:w-[24rem] lg:shrink-0 lg:border-l lg:border-border">
						<ThreadPane conversationId={conversationId} rootMessageId={threadId} conversationNames={conversationNames} canManage={canManage} onClose={closeThread} highlightMessageId={jumpTo} />
					</aside>
				)}
			</div>

			<NewDirectDialog
				open={dialog === 'direct'}
				onOpenChange={(open) => setDialog(open ? 'direct' : null)}
				people={people.list}
				meEmployeeId={meEmployeeId}
				onCreate={async (employeeIds) => {
					const conversation = await actions.direct(employeeIds).catch((error) => {
						reportFailure();
						throw error;
					});
					router.push(`/chat/${conversation.id}`);
				}}
			/>
			<NewChannelDialog
				open={dialog === 'channel'}
				onOpenChange={(open) => setDialog(open ? 'channel' : null)}
				people={people.list}
				meEmployeeId={meEmployeeId}
				onCreate={async (input) => {
					const conversation = await actions.createChannel({ name: input.name, topic: input.topic || null, visibility: input.visibility, memberEmployeeIds: input.memberEmployeeIds }).catch((error) => {
						reportFailure();
						throw error;
					});
					router.push(`/chat/${conversation.id}`);
				}}
			/>
			<BrowseChannelsDialog
				open={dialog === 'browse'}
				onOpenChange={(open) => setDialog(open ? 'browse' : null)}
				channels={browse.channels}
				isLoading={browse.isLoading}
				onJoin={async (id) => {
					const conversation = await actions.join(id).catch((error) => {
						reportFailure();
						throw error;
					});
					router.push(`/chat/${conversation.id}`);
				}}
			/>
		</PageLayout>
	);
}
