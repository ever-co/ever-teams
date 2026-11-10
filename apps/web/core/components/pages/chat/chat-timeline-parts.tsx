'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, Calendar, Lock, Users } from '@/core/components/icons';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { otherPeopleOf } from '@/core/lib/utils/chat-list';
import { EChatConversationKind, EChatVisibility, IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import { ConversationGlyph } from './conversation-glyph';

/** The line between two days of a timeline: the day in a pill, centred on a hairline. */
export function DayDivider({ label }: Readonly<{ label: string }>) {
	return (
		<div role="separator" aria-label={label} className="relative flex items-center justify-center px-4 pb-1 pt-3">
			<span className="absolute inset-x-4 top-1/2 mt-1 border-border hairline-t" aria-hidden="true" />
			<span className="relative rounded-full bg-background px-3 py-0.5 text-[11px] font-medium text-muted-foreground hairline-ring ring-border">{label}</span>
		</div>
	);
}

/** The line above the first message the reader has not seen yet. */
export function NewDivider({ label }: Readonly<{ label: string }>) {
	return (
		<div role="separator" aria-label={label} className="flex items-center gap-2 px-4 pb-0.5 pt-2">
			<span className="h-px flex-1 bg-primary/40" aria-hidden="true" />
			<span className="rounded-full bg-primary px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">{label}</span>
		</div>
	);
}

/** The line between a thread's first message and its replies, saying how many there are. */
export function RepliesDivider({ label }: Readonly<{ label: string }>) {
	return (
		<div role="separator" aria-label={label} className="flex items-center gap-3 px-4 py-2">
			<span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
			<span className="flex-1 border-border hairline-t" aria-hidden="true" />
		</div>
	);
}

/**
 * The pill over the bottom of a timeline while the reader is further up: it brings them back to the newest message,
 * and says how many arrived meanwhile.
 */
export function JumpToLatest({ count, onClick }: Readonly<{ count: number; onClick: () => void }>) {
	const t = useTranslations();
	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4">
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'pointer-events-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full pe-3.5 ps-2.5 text-xs font-medium shadow-md shadow-black/10 outline-none transition-[box-shadow,background-color] hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/25',
					count > 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-popover text-foreground hairline-ring ring-border'
				)}
			>
				<ArrowDown className="size-3.5" aria-hidden="true" />
				{count > 0 ? t('teamChat.NEW_MESSAGES', { count }) : t('teamChat.JUMP_TO_LATEST')}
			</button>
		</div>
	);
}

/**
 * The very top of a conversation, shown once no older message is left to load: what the conversation is (its mark,
 * its name, its topic) and who is in it, so an empty one does not open on a blank pane.
 */
export function ConversationWelcome({
	conversation,
	title,
	people,
	meEmployeeId,
	locale
}: Readonly<{ conversation: IChatConversationWithState; title: string; people: ReadonlyMap<string, ChatPerson>; meEmployeeId: string | null; locale: string }>) {
	const t = useTranslations();
	const isChannel = conversation.kind === EChatConversationKind.Channel;
	const others = otherPeopleOf(conversation, people, meEmployeeId);
	const name = title.replace(/^#/, '');
	const isGroup = !isChannel && others.length > 1;
	// A channel introduces itself with its topic when it has one.
	const text = isChannel ? conversation.topic || t('teamChat.START_OF_CHANNEL_TEXT') : t('teamChat.START_OF_DIRECT_TEXT');
	const createdOn = conversation.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(conversation.createdAt)) : null;

	return (
		<div className="flex flex-col items-start gap-1 px-4 pb-3 pt-10">
			{isGroup ? (
				<AvatarStack people={others.map((person) => ({ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }))} max={6} size="md" />
			) : (
				<ConversationGlyph conversation={conversation} people={people} meEmployeeId={meEmployeeId} size="hero" />
			)}
			<h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground text-balance">{isChannel ? t('teamChat.START_OF_CHANNEL', { name }) : t('teamChat.START_OF_DIRECT', { name })}</h2>
			<p className="max-w-prose whitespace-pre-wrap text-[13px] text-muted-foreground">{text}</p>
			{isChannel && (
				<p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
					{conversation.visibility === EChatVisibility.Private && (
						<span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-foreground/80">
							<Lock className="size-3" aria-hidden="true" />
							{t('teamChat.PRIVATE_CHANNEL')}
						</span>
					)}
					<span className="inline-flex items-center gap-1">
						<Users className="size-3.5" aria-hidden="true" />
						{t('teamChat.MEMBER_COUNT', { count: conversation.memberCount })}
					</span>
					{createdOn && (
						<span className="inline-flex items-center gap-1">
							<Calendar className="size-3.5" aria-hidden="true" />
							{t('teamChat.CREATED_ON', { date: createdOn })}
						</span>
					)}
				</p>
			)}
		</div>
	);
}
