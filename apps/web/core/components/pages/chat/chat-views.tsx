'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowLeft, AtSign, CheckDouble, ChevronRight, Comment, Inbox } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson, conversationTitle, plainBody } from '@/core/lib/utils/chat-format';
import { badgeCount } from '@/core/lib/utils/chat-list';
import { fullDateTime, relativeTime } from '@/core/lib/utils/chat-timeline';
import { IChatConversationWithState, IChatMessage } from '@/core/types/interfaces/common/chat';
import { ChatCardRowsSkeleton, ChatEmptyState, ChatErrorState } from './chat-states';
import { BAR_BUTTON } from './conversation-header';
import { ConversationGlyph } from './conversation-glyph';

const CARD = 'overflow-hidden rounded-xl bg-card hairline-ring ring-border hairline-divide-y divide-border';
const CARD_ROW = 'group flex gap-3 px-4 py-3 outline-none transition-colors hover:bg-foreground/[0.035] focus-visible:bg-foreground/[0.05]';
const COUNT_BADGE = 'inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] font-semibold tabular-nums leading-none';

/** The frame of a list view: a top bar (what the view is, how much it holds, its action) over a scrolling column. */
function ViewFrame({
	icon,
	title,
	count,
	action,
	onBack,
	children
}: Readonly<{ icon: ReactNode; title: string; count: number; action?: ReactNode; onBack?: () => void; children: ReactNode }>) {
	const t = useTranslations();
	return (
		<section className="flex h-full min-h-0 flex-col">
			<header className="flex h-12 shrink-0 items-center gap-2 border-border px-3 hairline-b">
				{onBack && (
					<button type="button" onClick={onBack} className={cn(BAR_BUTTON, 'lg:hidden')} aria-label={t('teamChat.BACK')} title={t('teamChat.BACK')}>
						<ArrowLeft className="rtl:rotate-180" />
					</button>
				)}
				<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4" aria-hidden="true">
					{icon}
				</span>
				<h1 className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</h1>
				{count > 0 && <span className="rounded-full bg-foreground/[0.07] px-1.5 py-px text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>}
				{action && <div className="ms-auto flex shrink-0 items-center gap-1">{action}</div>}
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 lg:px-6">{children}</div>
			</div>
		</section>
	);
}

/** The Unreads view: every conversation holding something the reader has not seen, and the way to clear them all. */
export function ChatUnreadsView({
	conversations,
	people,
	meEmployeeId,
	isLoading,
	onMarkAllRead,
	onBack
}: Readonly<{
	/** The unread conversations, in the list's order. */
	conversations: readonly IChatConversationWithState[];
	people: ReadonlyMap<string, ChatPerson>;
	meEmployeeId: string | null;
	isLoading: boolean;
	onMarkAllRead: () => void;
	onBack?: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [now] = useState(() => new Date());

	return (
		<ViewFrame
			icon={<Inbox />}
			title={t('teamChat.UNREADS')}
			count={conversations.length}
			onBack={onBack}
			action={
				<Button variant="outline" size="sm" onClick={onMarkAllRead} disabled={conversations.length === 0}>
					<CheckDouble className="size-3.5" /> {t('teamChat.MARK_ALL_READ')}
				</Button>
			}
		>
			{isLoading && <ChatCardRowsSkeleton rows={4} />}
			{!isLoading && conversations.length === 0 && <ChatEmptyState icon={<CheckDouble />} title={t('teamChat.NO_UNREADS_TITLE')} message={t('teamChat.NO_UNREADS_TEXT')} />}
			{conversations.length > 0 && (
				<ul className={CARD}>
					{conversations.map((conversation) => {
						const unread = conversation.state?.unreadCount ?? 0;
						const mentions = conversation.state?.mentionCount ?? 0;
						const lastAt = conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : null;
						return (
							<li key={conversation.id}>
								<Link href={`/chat/${conversation.id}`} className={cn(CARD_ROW, 'items-center')}>
									<ConversationGlyph conversation={conversation} people={people} meEmployeeId={meEmployeeId} size="tile" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-[13px] font-semibold text-foreground">{conversationTitle(conversation, people, meEmployeeId, t('teamChat.UNNAMED')).replace(/^#/, '')}</span>
										<span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
											<span className="truncate">{t('teamChat.UNREAD_COUNT', { count: unread })}</span>
											{lastAt && (
												<>
													<span aria-hidden="true">·</span>
													<time dateTime={conversation.lastMessageAt ?? undefined} title={fullDateTime(lastAt, locale)} className="shrink-0">
														{relativeTime(lastAt, locale, now)}
													</time>
												</>
											)}
										</span>
									</span>
									{mentions > 0 && (
										<span className={cn(COUNT_BADGE, 'bg-primary text-primary-foreground')} title={t('teamChat.MENTION_COUNT', { count: mentions })}>
											<AtSign className="size-3" aria-hidden="true" />
											{badgeCount(mentions)}
										</span>
									)}
									{unread > 0 && <span className={cn(COUNT_BADGE, 'bg-foreground/[0.08] text-foreground')}>{badgeCount(unread)}</span>}
									<ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</ViewFrame>
	);
}

/** The Threads view: the threads the reader follows, each with where it is, how it started and what is new in it. */
export function ChatThreadsView({
	threads,
	conversations,
	conversationNames,
	people,
	peopleByUser,
	meEmployeeId,
	isLoading,
	isError,
	onRetry,
	onBack
}: Readonly<{
	threads: ReadonlyArray<IChatMessage & { unreadReplies: number }>;
	conversations: ReadonlyMap<string, IChatConversationWithState>;
	conversationNames: ReadonlyMap<string, string>;
	people: ReadonlyMap<string, ChatPerson>;
	peopleByUser: ReadonlyMap<string, ChatPerson>;
	meEmployeeId: string | null;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	onBack?: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [now] = useState(() => new Date());
	const unread = threads.filter((root) => root.unreadReplies > 0).length;

	return (
		<ViewFrame icon={<Comment />} title={t('teamChat.THREADS')} count={unread} onBack={onBack}>
			{isLoading && <ChatCardRowsSkeleton rows={3} />}
			{isError && threads.length === 0 && <ChatErrorState message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={onRetry} />}
			{!isLoading && !isError && threads.length === 0 && <ChatEmptyState icon={<Comment />} title={t('teamChat.NO_THREADS_TITLE')} message={t('teamChat.NO_THREADS_TEXT')} />}
			{threads.length > 0 && (
				<ul className={CARD}>
					{threads.map((root) => {
						const conversation = conversations.get(root.conversationId);
						const author = (root.authorEmployeeId && people.get(String(root.authorEmployeeId))) || (root.authorUserId && peopleByUser.get(String(root.authorUserId))) || null;
						const channelName = conversationNames.get(root.conversationId);
						// A channel reads `#name`; a direct conversation, its people.
						const where = conversation ? conversationTitle(conversation, people, meEmployeeId, t('teamChat.UNNAMED')) : channelName ? `#${channelName}` : t('teamChat.THREAD');
						const lastAt = root.lastReplyAt ? new Date(root.lastReplyAt) : null;
						return (
							<li key={root.id}>
								<Link href={`/chat/${root.conversationId}?thread=${root.id}`} className={cn(CARD_ROW, 'items-start')}>
									{author ? (
										<PersonAvatar person={{ id: author.employeeId, name: author.name, imageUrl: author.imageUrl }} className="mt-0.5 size-7 text-[11px] ring-0" />
									) : (
										<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-muted-foreground" aria-hidden="true">
											<Comment className="size-4" />
										</span>
									)}
									<span className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<span className="min-w-0 truncate font-medium text-foreground/80">{where}</span>
											{author && (
												<>
													<span aria-hidden="true">·</span>
													<span className="min-w-0 truncate">{author.name}</span>
												</>
											)}
										</span>
										<span className={cn('line-clamp-2 text-[13px] [overflow-wrap:anywhere]', root.deletedAt ? 'italic text-muted-foreground' : 'text-foreground', root.unreadReplies > 0 && 'font-medium')}>
											{plainBody(root.body, people, conversationNames) || t('teamChat.DELETED')}
										</span>
										<span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
											<span className="font-medium text-primary">{t('teamChat.REPLIES', { count: root.replyCount })}</span>
											{lastAt && (
												<>
													<span aria-hidden="true">·</span>
													<time dateTime={root.lastReplyAt ?? undefined} title={fullDateTime(lastAt, locale)}>
														{t('teamChat.LAST_REPLY', { time: relativeTime(lastAt, locale, now) })}
													</time>
												</>
											)}
										</span>
									</span>
									{root.unreadReplies > 0 && (
										<span className={cn(COUNT_BADGE, 'mt-0.5 bg-primary text-primary-foreground')} title={t('teamChat.UNREAD_REPLIES', { count: root.unreadReplies })}>
											{badgeCount(root.unreadReplies)}
										</span>
									)}
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</ViewFrame>
	);
}
