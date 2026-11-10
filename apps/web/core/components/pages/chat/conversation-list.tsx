'use client';

import { type KeyboardEvent, type ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BellOff, ChevronRight, Comment, Compose, Globe, Inbox, Plus, Search, Star, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { ChatPerson, conversationTitle, isUnread } from '@/core/lib/utils/chat-format';
import { badgeCount, conversationSections, filterConversations } from '@/core/lib/utils/chat-list';
import { EChatNotifyLevel, IChatCategory, IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import { ChatErrorState, ChatListSkeleton } from './chat-states';
import { ConversationGlyph } from './conversation-glyph';

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
	/** The list is being read for the first time: its rows show as placeholders under the header. */
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	/** Told the address of every row the reader picks, the one already open included (no navigation tells of that one). */
	onNavigate?: (href: string) => void;
}

const ROW =
	'flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25';
const ROW_ACTIVE = 'bg-foreground/[0.07] font-medium text-foreground';
const ROW_IDLE = 'text-foreground/80 hover:bg-foreground/[0.04] hover:text-foreground';
const BADGE = 'flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums leading-none';

/** One conversation of the list: its mark, its name, and what waits in it. */
function Row({
	conversation,
	title,
	isCurrent,
	people,
	meEmployeeId,
	mentionsLabel,
	onNavigate
}: Readonly<{
	conversation: IChatConversationWithState;
	title: string;
	isCurrent: boolean;
	people: ReadonlyMap<string, ChatPerson>;
	meEmployeeId: string | null;
	mentionsLabel: (count: number) => string;
	onNavigate?: (href: string) => void;
}>) {
	const unreadCount = conversation.state?.unreadCount ?? 0;
	const mentions = conversation.state?.mentionCount ?? 0;
	const muted = conversation.state?.notifyLevel === EChatNotifyLevel.Muted;
	// A muted conversation stays quiet in the list: no bold name, no count; a mention still shows.
	const loud = isUnread(conversation) && !muted;
	const href = `/chat/${conversation.id}`;

	return (
		<li>
			<Link
				href={href}
				onClick={() => onNavigate?.(href)}
				aria-current={isCurrent ? 'page' : undefined}
				className={cn(ROW, isCurrent ? ROW_ACTIVE : ROW_IDLE, loud && 'font-semibold text-foreground', muted && !isCurrent && 'text-muted-foreground/70')}
			>
				<ConversationGlyph conversation={conversation} people={people} meEmployeeId={meEmployeeId} className={cn(muted && 'opacity-60')} />
				<span className="min-w-0 flex-1 truncate">{title}</span>
				{conversation.state?.isFavorite && <Star className="size-3 shrink-0 fill-current text-amber-500" aria-hidden="true" />}
				{muted && <BellOff className="size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />}
				{mentions > 0 && (
					<span className={cn(BADGE, 'bg-primary text-primary-foreground')} title={mentionsLabel(mentions)}>
						{badgeCount(mentions)}
					</span>
				)}
				{mentions === 0 && loud && unreadCount > 0 && <span className={cn(BADGE, 'bg-foreground/[0.09] text-foreground')}>{badgeCount(unreadCount)}</span>}
			</Link>
		</li>
	);
}

/** A place of the pane that is not a conversation: Unreads, Threads. */
function PlaceRow({
	href,
	icon,
	label,
	isActive,
	badge,
	onNavigate
}: Readonly<{ href: string; icon: ReactNode; label: string; isActive: boolean; badge: number; onNavigate?: (href: string) => void }>) {
	return (
		<Link href={href} onClick={() => onNavigate?.(href)} aria-current={isActive ? 'page' : undefined} className={cn(ROW, '[&_svg]:size-4 [&_svg]:shrink-0', isActive ? ROW_ACTIVE : ROW_IDLE, badge > 0 && !isActive && 'font-medium text-foreground')}>
			<span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
				{icon}
			</span>
			<span className="min-w-0 flex-1 truncate">{label}</span>
			{badge > 0 && <span className={cn(BADGE, 'bg-foreground/[0.09] text-foreground')}>{badgeCount(badge)}</span>}
		</Link>
	);
}

/** A small button of a section's header (new, browse): shown with the header's hover, its focus, and on touch. */
function SectionAction({ label, onClick, children }: Readonly<{ label: string; onClick: () => void; children: ReactNode }>) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-foreground/[0.08] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5"
		>
			{children}
		</button>
	);
}

/**
 * A titled group of conversations that folds. Folded, it still shows the conversations that need the reader (unread
 * ones, the one that is open), so folding a busy section never hides news.
 */
function Section({
	id,
	label,
	closed,
	onToggle,
	actions,
	rows,
	isPinnedOpen,
	renderRow,
	empty
}: Readonly<{
	id: string;
	label: string;
	closed: ReadonlySet<string>;
	onToggle: (id: string) => void;
	actions?: ReactNode;
	rows: readonly IChatConversationWithState[];
	isPinnedOpen: (conversation: IChatConversationWithState) => boolean;
	renderRow: (conversation: IChatConversationWithState) => ReactNode;
	empty?: ReactNode;
}>) {
	const isOpen = !closed.has(id);
	const shown = isOpen ? rows : rows.filter(isPinnedOpen);
	return (
		<section className="mt-3">
			<div className="group flex h-7 items-center">
				<button
					type="button"
					onClick={() => onToggle(id)}
					aria-expanded={isOpen}
					className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<ChevronRight className={cn('size-3 shrink-0 transition-transform rtl:rotate-180', isOpen && 'rotate-90 rtl:rotate-90')} aria-hidden="true" />
					<span className="truncate">{label}</span>
					{rows.length > 0 && <span className="font-normal tabular-nums text-muted-foreground/70">{rows.length}</span>}
				</button>
				{actions && <div className="flex items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">{actions}</div>}
			</div>
			{shown.length > 0 && <ul className="mt-px flex flex-col gap-px">{shown.map(renderRow)}</ul>}
			{isOpen && rows.length === 0 && empty}
		</section>
	);
}

/** The quiet last row of an empty section: the way to add its first conversation. */
function AddRow({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="mt-px flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-start text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
				<Plus className="size-3.5" />
			</span>
			<span className="truncate">{label}</span>
		</button>
	);
}

/**
 * The left pane: a filter over the conversations, Unreads and Threads, then the categories with their channels, the
 * other channels and the direct messages, each section folding and carrying its own actions.
 */
export function ConversationList(props: Readonly<ConversationListProps>) {
	const t = useTranslations();
	const router = useRouter();
	const { conversations, categories, people, meEmployeeId, currentId, view, isLoading = false, isError = false } = props;
	const [query, setQuery] = useState('');
	const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());
	const unnamed = t('teamChat.UNNAMED');
	const titleOf = (conversation: IChatConversationWithState) => conversationTitle(conversation, people, meEmployeeId, unnamed).replace(/^#/, '');

	const sections = useMemo(() => conversationSections(conversations, categories), [categories, conversations]);
	const isFiltering = query.trim().length > 0;
	// Over the conversations already loaded, as the reader types: a few dozen names, matched on each keystroke.
	const matches = isFiltering ? filterConversations(conversations, titleOf, query) : [];

	const toggle = (id: string) =>
		setClosed((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const onFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		// Shift+Escape is the page's "mark all read": only a plain Escape clears the filter.
		if (event.key === 'Escape' && !event.shiftKey && query) {
			event.preventDefault();
			setQuery('');
		}
		if (event.key === 'Enter' && matches.length > 0) {
			event.preventDefault();
			setQuery('');
			const href = `/chat/${matches[0].id}`;
			// As a click on the row: the page closes the list over the conversation on a narrow screen.
			props.onNavigate?.(href);
			router.push(href);
		}
	};

	const isCurrent = (conversation: IChatConversationWithState) => conversation.id === currentId && view === 'conversation';
	// What a folded section still shows: the open conversation, and those with news the reader asked to hear about.
	const needsReader = (conversation: IChatConversationWithState) =>
		isCurrent(conversation) || (conversation.state?.mentionCount ?? 0) > 0 || (isUnread(conversation) && conversation.state?.notifyLevel !== EChatNotifyLevel.Muted);
	const mentionsLabel = (count: number) => t('teamChat.MENTION_COUNT', { count });
	const renderRow = (conversation: IChatConversationWithState) => (
		<Row key={conversation.id} conversation={conversation} title={titleOf(conversation)} isCurrent={isCurrent(conversation)} people={people} meEmployeeId={meEmployeeId} mentionsLabel={mentionsLabel} onNavigate={props.onNavigate} />
	);
	const isReady = !isLoading && !isError;

	return (
		<nav aria-label={t('teamChat.CONVERSATIONS')} className="flex h-full min-h-0 w-full flex-col">
			<div className="flex shrink-0 flex-col gap-2 px-3 pb-2 pt-3">
				<div className="flex items-center gap-1">
					<h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-foreground">{t('teamChat.TITLE')}</h2>
					<Button type="button" size="icon-sm" onClick={props.onNewDirect} aria-label={t('teamChat.NEW_MESSAGE')} title={t('teamChat.NEW_MESSAGE')}>
						<Compose className="size-4" />
					</Button>
				</div>
				<div className="relative">
					<Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={onFilterKeyDown}
						placeholder={t('teamChat.SEARCH_CONVERSATIONS')}
						aria-label={t('teamChat.SEARCH_CONVERSATIONS')}
						className="h-8 pe-7 ps-8 text-[13px] md:text-[13px]"
					/>
					{query.length > 0 && (
						<button
							type="button"
							onClick={() => setQuery('')}
							aria-label={t('teamChat.CLEAR_SEARCH')}
							title={t('teamChat.CLEAR_SEARCH')}
							className="absolute end-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
				{isFiltering ? (
					<section aria-label={t('teamChat.CONVERSATIONS')}>
						<h3 className="flex h-7 items-center gap-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
							{t('teamChat.CONVERSATIONS')}
							<span className="font-normal tabular-nums text-muted-foreground/70">{matches.length}</span>
						</h3>
						{matches.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('teamChat.NO_CONVERSATIONS')}</p>}
						<ul className="flex flex-col gap-px">{matches.map(renderRow)}</ul>
					</section>
				) : (
					<>
						<div className="flex flex-col gap-px">
							<PlaceRow href="/chat/unreads" icon={<Inbox />} label={t('teamChat.UNREADS')} isActive={view === 'unreads'} badge={props.unreadCount} onNavigate={props.onNavigate} />
							<PlaceRow href="/chat/threads" icon={<Comment />} label={t('teamChat.THREADS')} isActive={view === 'threads'} badge={props.threadsUnread} onNavigate={props.onNavigate} />
						</div>
						{isLoading && <ChatListSkeleton />}
						{isError && <ChatErrorState compact message={t('teamChat.LOAD_ERROR')} retryLabel={t('teamChat.RETRY')} onRetry={() => props.onRetry?.()} />}
						{isReady && (
							<>
								{sections.categorised.map(({ category, channels }) => (
									<Section key={category.id} id={`category:${category.id}`} label={category.name} closed={closed} onToggle={toggle} rows={channels} isPinnedOpen={needsReader} renderRow={renderRow} />
								))}
								<Section
									id="channels"
									label={t('teamChat.CHANNELS')}
									closed={closed}
									onToggle={toggle}
									rows={sections.channels}
									isPinnedOpen={needsReader}
									renderRow={renderRow}
									actions={
										<>
											<SectionAction label={t('teamChat.BROWSE_CHANNELS')} onClick={props.onBrowse}>
												<Globe />
											</SectionAction>
											<SectionAction label={t('teamChat.NEW_CHANNEL')} onClick={props.onNewChannel}>
												<Plus />
											</SectionAction>
										</>
									}
									empty={
										sections.categorised.length === 0 ? (
											<>
												<p className="px-2 py-1 text-xs text-muted-foreground">{t('teamChat.NO_CHANNELS')}</p>
												<AddRow label={t('teamChat.NEW_CHANNEL')} onClick={props.onNewChannel} />
											</>
										) : (
											<AddRow label={t('teamChat.BROWSE_CHANNELS')} onClick={props.onBrowse} />
										)
									}
								/>
								<Section
									id="direct"
									label={t('teamChat.DIRECT_MESSAGES')}
									closed={closed}
									onToggle={toggle}
									rows={sections.direct}
									isPinnedOpen={needsReader}
									renderRow={renderRow}
									actions={
										<SectionAction label={t('teamChat.NEW_MESSAGE')} onClick={props.onNewDirect}>
											<Plus />
										</SectionAction>
									}
									empty={
										<>
											<p className="px-2 py-1 text-xs text-muted-foreground">{t('teamChat.NO_DIRECT')}</p>
											<AddRow label={t('teamChat.NEW_MESSAGE')} onClick={props.onNewDirect} />
										</>
									}
								/>
							</>
						)}
					</>
				)}
			</div>
		</nav>
	);
}
