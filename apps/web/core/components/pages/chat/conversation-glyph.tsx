import { Lock, UsersGroup } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { otherPeopleOf } from '@/core/lib/utils/chat-list';
import { EChatConversationKind, EChatVisibility, IChatConversationWithState } from '@/core/types/interfaces/common/chat';

/** `row` is the list's 20px mark, `tile` the 28px one of a header or a card, `hero` the big one of a conversation's start. */
type GlyphSize = 'row' | 'tile' | 'hero';

const BOX: Record<GlyphSize, string> = {
	row: 'size-5',
	tile: 'size-7 rounded-lg bg-foreground/[0.05]',
	hero: 'size-14 rounded-2xl bg-primary/10 text-primary'
};

const HASH: Record<GlyphSize, string> = {
	row: 'text-[15px] leading-none',
	tile: 'text-base leading-none',
	hero: 'text-3xl font-semibold leading-none'
};

const ICON: Record<GlyphSize, string> = {
	row: 'size-3.5',
	tile: 'size-4',
	hero: 'size-7'
};

const AVATAR: Record<GlyphSize, string> = {
	row: 'size-5 text-[9px] ring-0',
	tile: 'size-7 text-[11px] ring-0',
	hero: 'size-14 text-lg ring-0'
};

/**
 * What stands for a conversation wherever it is listed: `#` for a channel, a lock for a private one, the other
 * person's face for a direct conversation, a group mark for several people.
 */
export function ConversationGlyph({
	conversation,
	people,
	meEmployeeId,
	size = 'row',
	className
}: Readonly<{
	conversation: Pick<IChatConversationWithState, 'kind' | 'visibility' | 'members'>;
	people: ReadonlyMap<string, ChatPerson>;
	meEmployeeId: string | null;
	size?: GlyphSize;
	className?: string;
}>) {
	const box = cn('flex shrink-0 items-center justify-center text-muted-foreground', BOX[size], className);

	if (conversation.kind === EChatConversationKind.Channel) {
		return (
			<span className={box} aria-hidden="true">
				{conversation.visibility === EChatVisibility.Private ? <Lock className={ICON[size]} /> : <span className={cn('font-medium', HASH[size])}>#</span>}
			</span>
		);
	}

	const others = otherPeopleOf(conversation, people, meEmployeeId);
	if (conversation.kind === EChatConversationKind.Direct && others.length === 1) {
		const [person] = others;
		return <PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} className={cn(AVATAR[size], className)} />;
	}

	return (
		<span className={cn(box, size === 'row' && 'rounded-md bg-foreground/[0.07]')} aria-hidden="true">
			<UsersGroup className={size === 'row' ? 'size-3' : ICON[size]} />
		</span>
	);
}
