'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock, Plus, Star, Users } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { ChatPerson, conversationTitle, isUnread } from '@/core/lib/utils/chat-format';
import { EChatConversationKind, EChatVisibility, IChatCategory, IChatConversationWithState } from '@/core/types/interfaces/common/chat';

export interface ConversationListProps {
	conversations: readonly IChatConversationWithState[];
	categories: readonly IChatCategory[];
	people: ReadonlyMap<string, ChatPerson>;
	meEmployeeId: string | null;
	currentId: string | null;
	view: 'conversation' | 'unreads' | 'threads';
	unreadCount: number;
	threadsUnread: number;
	onNewChannel: () => void;
	onNewDirect: () => void;
	onBrowse: () => void;
}

function Row({ conversation, title, isCurrent }: Readonly<{ conversation: IChatConversationWithState; title: string; isCurrent: boolean }>) {
	const unread = isUnread(conversation);
	const mentions = conversation.state?.mentionCount ?? 0;
	const muted = conversation.state?.notifyLevel === 'muted';
	const isChannel = conversation.kind === EChatConversationKind.Channel;

	return (
		<Link
			href={`/chat/${conversation.id}`}
			aria-current={isCurrent ? 'page' : undefined}
			className={cn(
				'flex items-center gap-2 rounded-md px-2 py-1 text-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
				isCurrent ? 'bg-foreground/[0.07] text-foreground' : 'hover:bg-foreground/[0.04]',
				unread && !muted ? 'font-semibold text-foreground' : 'text-muted-foreground'
			)}
		>
			<span className="w-4 shrink-0 text-center text-muted-foreground">
				{isChannel ? conversation.visibility === EChatVisibility.Private ? <Lock className="size-3.5" /> : '#' : <Users className="size-3.5" />}
			</span>
			<span className="min-w-0 flex-1 truncate">{title}</span>
			{conversation.state?.isFavorite && <Star className="size-3 shrink-0 text-amber-500" aria-hidden="true" />}
			{mentions > 0 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground">{mentions}</span>}
			{mentions === 0 && unread && !muted && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
		</Link>
	);
}

/** The left pane: Unreads and Threads, the categories with their channels, direct messages, and the actions. */
export function ConversationList(props: Readonly<ConversationListProps>) {
	const t = useTranslations();
	const { conversations, categories, people, meEmployeeId, currentId, view } = props;
	const titleOf = (conversation: IChatConversationWithState) => conversationTitle(conversation, people, meEmployeeId, t('teamChat.UNNAMED'));

	const groups = useMemo(() => {
		const channels = conversations.filter((c) => c.kind === EChatConversationKind.Channel && !c.archivedAt);
		const byCategory = new Map<string, IChatConversationWithState[]>();
		for (const channel of channels) {
			const key = channel.categoryId ? String(channel.categoryId) : '';
			byCategory.set(key, [...(byCategory.get(key) ?? []), channel]);
		}
		const orderedCategories = [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
		return {
			categorised: orderedCategories.map((category) => ({ category, channels: byCategory.get(String(category.id)) ?? [] })).filter((group) => group.channels.length),
			uncategorised: byCategory.get('') ?? [],
			direct: conversations.filter((c) => c.kind !== EChatConversationKind.Channel && !c.archivedAt)
		};
	}, [categories, conversations]);

	const sectionClass = 'px-2 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground';
	const viewLink = (href: string, label: string, active: boolean, badge: number) => (
		<Link href={href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-2 rounded-md px-2 py-1 text-[13px]', active ? 'bg-foreground/[0.07] text-foreground' : 'text-muted-foreground hover:bg-foreground/[0.04]')}>
			<span className="min-w-0 flex-1 truncate">{label}</span>
			{badge > 0 && <span className="rounded-full bg-foreground/[0.08] px-1.5 text-[10px] font-semibold tabular-nums">{badge}</span>}
		</Link>
	);

	return (
		<nav aria-label={t('teamChat.CONVERSATIONS')} className="flex h-full flex-col">
			<div className="flex items-center gap-1 px-2 pt-2">
				<h2 className="flex-1 px-1 text-sm font-semibold text-foreground">{t('teamChat.TITLE')}</h2>
				<Button variant="ghost" size="icon-sm" onClick={props.onNewDirect} aria-label={t('teamChat.NEW_MESSAGE')} title={t('teamChat.NEW_MESSAGE')}>
					<Plus className="size-4" />
				</Button>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
				<div className="flex flex-col gap-0.5 pt-1">
					{viewLink('/chat/unreads', t('teamChat.UNREADS'), view === 'unreads', props.unreadCount)}
					{viewLink('/chat/threads', t('teamChat.THREADS'), view === 'threads', props.threadsUnread)}
				</div>
				{groups.categorised.map(({ category, channels }) => (
					<section key={category.id}>
						<h3 className={sectionClass}>{category.name}</h3>
						{channels.map((conversation) => (
							<Row key={conversation.id} conversation={conversation} title={titleOf(conversation)} isCurrent={conversation.id === currentId && view === 'conversation'} />
						))}
					</section>
				))}
				<section>
					<h3 className={cn(sectionClass, 'flex items-center')}>
						<span className="flex-1">{t('teamChat.CHANNELS')}</span>
						<button type="button" onClick={props.onBrowse} className="cursor-pointer normal-case tracking-normal hover:text-foreground">
							{t('teamChat.BROWSE')}
						</button>
						<button type="button" onClick={props.onNewChannel} className="ml-2 cursor-pointer normal-case tracking-normal hover:text-foreground" aria-label={t('teamChat.NEW_CHANNEL')}>
							<Plus className="size-3.5" />
						</button>
					</h3>
					{groups.uncategorised.map((conversation) => (
						<Row key={conversation.id} conversation={conversation} title={titleOf(conversation)} isCurrent={conversation.id === currentId && view === 'conversation'} />
					))}
					{groups.uncategorised.length === 0 && groups.categorised.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">{t('teamChat.NO_CHANNELS')}</p>}
				</section>
				<section>
					<h3 className={cn(sectionClass, 'flex items-center')}>
						<span className="flex-1">{t('teamChat.DIRECT_MESSAGES')}</span>
						<button type="button" onClick={props.onNewDirect} className="cursor-pointer normal-case tracking-normal hover:text-foreground" aria-label={t('teamChat.NEW_MESSAGE')}>
							<Plus className="size-3.5" />
						</button>
					</h3>
					{groups.direct.map((conversation) => (
						<Row key={conversation.id} conversation={conversation} title={titleOf(conversation)} isCurrent={conversation.id === currentId && view === 'conversation'} />
					))}
					{groups.direct.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">{t('teamChat.NO_DIRECT')}</p>}
				</section>
			</div>
		</nav>
	);
}
