'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Bell, BellOff, Link, LogOut, MoreHorizontal, Star, Users } from '@/core/components/icons';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { useChatMembers } from '@/core/hooks/chat/use-chat-conversations';
import { cn } from '@/core/lib/helpers';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { directPartnerOf } from '@/core/lib/utils/chat-navigation';
import { EChatConversationKind, EChatNotifyLevel, IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import type { ETimerStatus } from '@/core/types/generics/enums/timer';
import { PresenceDot } from './chat-presence-dot';
import { ConversationGlyph } from './conversation-glyph';

/** An icon button of a pane's top bar. */
export const BAR_BUTTON =
	'inline-flex size-7 shrink-0 cursor-pointer [@media(pointer:coarse)]:size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground [&_svg]:size-4';

/**
 * The member count of a conversation, as a chip that lists who they are. The people of the active team show by name;
 * members the team does not know (a channel of the whole organization holds people of other teams) show as a count.
 */
function MembersChip({
	conversation,
	people,
	meEmployeeId,
	presence
}: Readonly<{ conversation: IChatConversationWithState; people: ReadonlyMap<string, ChatPerson>; meEmployeeId: string | null; presence?: ReadonlyMap<string, ETimerStatus> }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	// Read when the list opens; until it answers, the members the conversation came with (a direct one carries them).
	const { members, isLoading } = useChatMembers(conversation.id, isOpen);
	const { known, unknown } = useMemo(() => {
		const all = members.length ? members : (conversation.members ?? []);
		const named = all.map((member) => people.get(String(member.employeeId))).filter((person): person is ChatPerson => !!person);
		return { known: named.sort((a, b) => a.name.localeCompare(b.name)), unknown: Math.max(0, Math.max(all.length, conversation.memberCount) - named.length) };
	}, [conversation.memberCount, conversation.members, members, people]);
	const label = t('teamChat.MEMBER_COUNT', { count: conversation.memberCount });

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				aria-label={label}
				title={label}
				className="me-1 hidden h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-card px-2.5 text-xs font-medium tabular-nums text-muted-foreground outline-none hairline-ring ring-border transition-colors hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:text-foreground sm:inline-flex"
			>
				<Users className="size-3.5" aria-hidden="true" />
				{conversation.memberCount}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 p-1">
				<p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</p>
				<ul className="max-h-72 overflow-y-auto">
					{known.map((person) => (
						<li key={person.employeeId} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-foreground [@media(pointer:coarse)]:h-10">
							<span className="relative inline-flex shrink-0" data-presence={presence?.get(person.employeeId)}>
								<PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} className="size-5 text-[9px] ring-0" />
								{presence?.get(person.employeeId) && <PresenceDot status={presence.get(person.employeeId) as ETimerStatus} />}
							</span>
							<span className="min-w-0 flex-1 truncate">{person.name}</span>
							{person.employeeId === meEmployeeId && <span className="shrink-0 text-[11px] text-muted-foreground">{t('teamChat.YOU')}</span>}
						</li>
					))}
					{isLoading && known.length === 0 && (
						<li aria-hidden="true" className="flex h-8 items-center gap-2.5 px-2">
							<span className="size-5 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
							<span className="h-2.5 w-2/5 animate-pulse rounded-full bg-foreground/[0.06]" />
						</li>
					)}
					{!isLoading && unknown > 0 && (
						<li className="flex h-8 items-center gap-2.5 px-2 text-[13px] text-muted-foreground">
							<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]" aria-hidden="true">
								<Users className="size-3" />
							</span>
							<span className="tabular-nums">+{unknown}</span>
						</li>
					)}
				</ul>
			</PopoverContent>
		</Popover>
	);
}

/**
 * The top bar of a conversation: what it is (its mark, its name, its topic), who is in it, and the reader's own
 * settings for it (favourite, notifications, the link, leaving).
 */
export function ConversationHeader({
	conversation,
	title,
	people,
	meEmployeeId,
	onBack,
	onToggleFavorite,
	onNotify,
	onCopyLink,
	onLeave,
	extra,
	presence
}: Readonly<{
	conversation: IChatConversationWithState;
	/** The conversation's name without the `#` of a channel. */
	title: string;
	people: ReadonlyMap<string, ChatPerson>;
	meEmployeeId: string | null;
	onBack?: () => void;
	onToggleFavorite: () => void;
	onNotify: (level: EChatNotifyLevel) => void;
	onCopyLink: () => void;
	onLeave: () => void;
	/** More buttons of the bar, before the members (the conversation's files). */
	extra?: ReactNode;
	/** The status dot of each person the app knows, by employee id. */
	presence?: ReadonlyMap<string, ETimerStatus>;
}>) {
	const t = useTranslations();
	const isFavorite = !!conversation.state?.isFavorite;
	const isMuted = conversation.state?.notifyLevel === EChatNotifyLevel.Muted;
	const canLeave = !conversation.isDefault && conversation.kind !== EChatConversationKind.Direct;
	const partner = directPartnerOf(conversation, meEmployeeId);
	const partnerStatus = partner ? (presence?.get(partner) ?? null) : null;

	return (
		<header className="flex h-12 shrink-0 items-center gap-2 border-border px-3 hairline-b">
			{onBack && (
				<button type="button" onClick={onBack} className={cn(BAR_BUTTON, 'lg:hidden')} aria-label={t('teamChat.BACK')} title={t('teamChat.BACK')}>
					<ArrowLeft className="rtl:rotate-180" />
				</button>
			)}
			<ConversationGlyph conversation={conversation} people={people} meEmployeeId={meEmployeeId} size="tile" status={partnerStatus} />
			<div className="flex min-w-0 flex-1 items-baseline gap-2.5">
				<h1 className="max-w-[70%] shrink-0 truncate text-sm font-semibold text-foreground">{title}</h1>
				{conversation.topic && (
					<Tooltip>
						<TooltipTrigger render={<span className="hidden min-w-0 cursor-default truncate text-xs text-muted-foreground md:block" />}>{conversation.topic}</TooltipTrigger>
						<TooltipContent side="bottom" align="start" className="max-w-sm whitespace-pre-wrap text-start font-normal">
							{conversation.topic}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-0.5">
				{extra}
				<MembersChip conversation={conversation} people={people} meEmployeeId={meEmployeeId} presence={presence} />
				<button type="button" onClick={onToggleFavorite} className={BAR_BUTTON} aria-label={t('teamChat.FAVORITE')} title={t('teamChat.FAVORITE')} aria-pressed={isFavorite}>
					<Star className={cn(isFavorite && 'fill-current text-amber-500')} />
				</button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button type="button" className={BAR_BUTTON} aria-label={t('teamChat.NOTIFY_LEVEL')} title={t('teamChat.NOTIFY_LEVEL')}>
							{isMuted ? <BellOff /> : <Bell />}
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48">
						<DropdownMenuLabel>{t('teamChat.NOTIFY_LEVEL')}</DropdownMenuLabel>
						<DropdownMenuRadioGroup value={String(conversation.state?.notifyLevel ?? EChatNotifyLevel.All)} onValueChange={(value) => onNotify(value as EChatNotifyLevel)}>
							<DropdownMenuRadioItem value={EChatNotifyLevel.All}>{t('teamChat.NOTIFY.ALL')}</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value={EChatNotifyLevel.Mentions}>{t('teamChat.NOTIFY.MENTIONS')}</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value={EChatNotifyLevel.Muted}>{t('teamChat.NOTIFY.MUTED')}</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button type="button" className={BAR_BUTTON} aria-label={t('teamChat.MORE')} title={t('teamChat.MORE')}>
							<MoreHorizontal />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-48">
						<DropdownMenuItem onClick={onCopyLink}>
							<Link /> {t('teamChat.COPY_LINK')}
						</DropdownMenuItem>
						{canLeave && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem variant="destructive" onClick={onLeave}>
									<LogOut /> {t('teamChat.LEAVE')}
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
