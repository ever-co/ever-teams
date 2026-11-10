'use client';

import { queryKeys } from '@/core/query/keys';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowLeft, Compose, Globe, MessageBlocked, MessageCircle } from '@/core/components/icons';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import { useChatBrowse, useChatConversation, useChatConversations, useChatStates, useChatThreads } from '@/core/hooks/chat/use-chat-conversations';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { cn } from '@/core/lib/helpers';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import { conversationTitle, isUnread } from '@/core/lib/utils/chat-format';
import { userState } from '@/core/stores/user/user';
import { useAtomValue } from 'jotai';
import { ChatPageSkeleton, ConversationPaneSkeleton } from './chat-page-skeleton';
import { BrowseChannelsDialog, NewChannelDialog, NewDirectDialog } from './chat-dialogs';
import { ChatEmptyState } from './chat-states';
import { ChatThreadsView, ChatUnreadsView } from './chat-views';
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
	// On a narrow screen one pane shows at a time: the list, until a conversation (or Unreads, or Threads) is open.
	const [listOpen, setListOpen] = useState(view === 'conversation' && !conversationId);
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
	const showList = () => setListOpen(true);
	// Loading, or about to open the last conversation (`/chat` with conversations): the pane's outline, not "pick one".
	const openingLast = !conversationId && list.conversations.length > 0;
	const conversationLoading = !current.conversation && (current.isLoading || list.isLoading || openingLast);
	// The thread pane names the conversation it belongs to: `#general`, or the people of a direct one.
	const threadLabel = current.conversation ? conversationTitle(current.conversation, people.byEmployee, meEmployeeId, t('teamChat.UNNAMED')) : undefined;

	return (
		<PageLayout fill title={t('teamChat.TITLE')} className="p-0">
			<div className="relative flex h-full min-h-0">
				<aside className={cn('h-full w-full shrink-0 border-border lg:block lg:w-72 lg:border-e', listOpen ? 'block' : 'hidden')}>
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
						isLoading={list.isLoading}
						isError={list.isError}
						onRetry={() => list.retry()}
						// On a narrow screen the list covers the page: picking what is already open (no navigation follows) shows it again.
						onNavigate={(href) => {
							if (pathname?.endsWith(href)) setListOpen(false);
						}}
					/>
				</aside>

				<main className={cn('h-full min-w-0 flex-1', listOpen && 'hidden lg:block')}>
					{view === 'conversation' && current.conversation && (
						<ConversationView
							conversation={current.conversation}
							conversationNames={conversationNames}
							canManage={canManage}
							onOpenThread={openThread}
							onBack={showList}
							jumpToMessageId={threadId ? null : jumpTo}
						/>
					)}
					{view === 'conversation' && conversationLoading && <ConversationPaneSkeleton />}
					{view === 'conversation' && !current.conversation && !conversationLoading && (
						<div className="flex h-full flex-col">
							{/* The way back to the list, where the list is not beside this pane. */}
							<div className="flex h-12 shrink-0 items-center px-3 lg:hidden">
								<Button variant="ghost" size="sm" onClick={showList}>
									<ArrowLeft className="size-4 rtl:rotate-180" /> {t('teamChat.BACK')}
								</Button>
							</div>
							{conversationId ? (
								<ChatEmptyState className="flex-1" icon={<MessageBlocked />} title={t('teamChat.NOT_AVAILABLE_TITLE')} message={t('teamChat.NOT_AVAILABLE_TEXT')} />
							) : (
								<ChatEmptyState
									className="flex-1"
									icon={<MessageCircle />}
									title={t('teamChat.PICK_TITLE')}
									message={t('teamChat.PICK_TEXT')}
									action={
										<>
											<Button variant="outline" onClick={() => setDialog('browse')}>
												<Globe className="size-4" /> {t('teamChat.BROWSE_CHANNELS')}
											</Button>
											<Button onClick={() => setDialog('direct')}>
												<Compose className="size-4" /> {t('teamChat.NEW_MESSAGE')}
											</Button>
										</>
									}
								/>
							)}
						</div>
					)}
					{view === 'unreads' && (
						<ChatUnreadsView conversations={unreadList} people={people.byEmployee} meEmployeeId={meEmployeeId} isLoading={list.isLoading} onMarkAllRead={markAllRead} onBack={showList} />
					)}
					{view === 'threads' && (
						<ChatThreadsView
							threads={threads.threads}
							conversations={list.byId}
							conversationNames={conversationNames}
							people={people.byEmployee}
							peopleByUser={people.byUser}
							meEmployeeId={meEmployeeId}
							isLoading={threads.isLoading}
							isError={threads.isError}
							onRetry={() => threads.retry()}
							onBack={showList}
						/>
					)}
				</main>

				{view === 'conversation' && conversationId && threadId && (
					<aside className="absolute inset-0 z-10 bg-background lg:static lg:z-auto lg:w-[24rem] lg:shrink-0 lg:border-s lg:border-border">
						<ThreadPane
							conversationId={conversationId}
							rootMessageId={threadId}
							conversationNames={conversationNames}
							canManage={canManage}
							onClose={closeThread}
							highlightMessageId={jumpTo}
							conversationLabel={threadLabel}
						/>
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
