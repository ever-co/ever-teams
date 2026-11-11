'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CommandGroup, CommandItem } from '@/core/components/common/command';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { ConversationGlyph } from '@/core/components/pages/chat/conversation-glyph';
import { PresenceDot } from '@/core/components/pages/chat/chat-presence-dot';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import { useChatConversations } from '@/core/hooks/chat/use-chat-conversations';
import { useChatPresence } from '@/core/hooks/chat/use-chat-presence';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { conversationTitle, type ChatPerson } from '@/core/lib/utils/chat-format';
import { badgeCount } from '@/core/lib/utils/chat-list';
import {
	directPartnerOf,
	needsReader,
	paletteConversations,
	peopleWithoutDirect
} from '@/core/lib/utils/chat-navigation';
import type { IChatConversationWithState } from '@/core/types/interfaces/common/chat';

interface PaletteChatResultsProps {
	search: string;
	/** Closes the palette once a conversation is picked. */
	onDone: () => void;
	className?: string;
}

const ROW = 'min-h-10 gap-3 rounded-lg px-2 text-sm';

/**
 * The chat inside the command palette: the reader's conversations (a few, the unread first, until something is typed;
 * then all of them, filtered by the palette on their names, a direct one on the other person's), and once something is
 * typed, the people with no direct conversation yet, to write to. Picking one opens it.
 */
export function PaletteChatResults({ search, onDone, className }: Readonly<PaletteChatResultsProps>) {
	const t = useTranslations();
	const router = useRouter();
	const list = useChatConversations(true);
	const people = useChatPeople();
	const scope = useChatScope();
	const actions = useChatActions();
	const presence = useChatPresence();
	const meEmployeeId = scope?.employeeId ?? null;
	const hasSearch = search.trim().length > 0;
	const unnamed = t('teamChat.UNNAMED');

	const conversations = useMemo(
		() => paletteConversations(list.conversations, hasSearch),
		[hasSearch, list.conversations]
	);
	const others = useMemo(
		() => (hasSearch ? peopleWithoutDirect(people.list, list.conversations, people.byEmployee, meEmployeeId) : []),
		[hasSearch, list.conversations, meEmployeeId, people.byEmployee, people.list]
	);

	const open = useCallback(
		(conversationId: string) => {
			onDone();
			router.push(`/chat/${conversationId}`);
		},
		[onDone, router]
	);

	const write = useCallback(
		async (person: ChatPerson) => {
			onDone();
			try {
				const conversation = await actions.direct([person.employeeId]);
				router.push(`/chat/${conversation.id}`);
			} catch {
				toast.error(t('teamChat.UPDATE_FAILED'));
			}
		},
		[actions, onDone, router, t]
	);

	if (!conversations.length && !others.length) return null;

	const titleOf = (conversation: IChatConversationWithState) =>
		conversationTitle(conversation, people.byEmployee, meEmployeeId, unnamed);

	return (
		<>
			{conversations.length > 0 && (
				<CommandGroup heading={t('commandPalette.results.conversations')} className={className}>
					{conversations.map((conversation) => {
						const title = titleOf(conversation);
						const partner = directPartnerOf(conversation, meEmployeeId);
						const unread = needsReader(conversation)
							? conversation.state?.mentionCount || conversation.state?.unreadCount || 0
							: 0;
						return (
							<CommandItem
								key={conversation.id}
								value={`${title} ${conversation.id}`}
								onSelect={() => open(conversation.id)}
								className={ROW}
							>
								<span className="flex size-7 shrink-0 items-center justify-center">
									<ConversationGlyph
										conversation={conversation}
										people={people.byEmployee}
										meEmployeeId={meEmployeeId}
										status={partner ? presence.get(partner) : null}
									/>
								</span>
								<span
									className={
										unread
											? 'min-w-0 flex-1 truncate font-semibold text-foreground'
											: 'min-w-0 flex-1 truncate'
									}
								>
									{title.replace(/^#/, '')}
								</span>
								{unread > 0 && (
									<span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums leading-none text-primary-foreground">
										{badgeCount(unread)}
									</span>
								)}
							</CommandItem>
						);
					})}
				</CommandGroup>
			)}
			{others.length > 0 && (
				<CommandGroup heading={t('commandPalette.results.people')} className={className}>
					{others.map((person) => {
						const status = presence.get(person.employeeId);
						return (
							<CommandItem
								key={person.employeeId}
								value={`${person.name} ${person.employeeId}`}
								onSelect={() => void write(person)}
								className={ROW}
							>
								<span className="relative flex size-7 shrink-0 items-center justify-center">
									<PersonAvatar
										person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }}
										className="size-6 text-[10px] ring-0"
									/>
									{status && <PresenceDot status={status} />}
								</span>
								<span className="min-w-0 flex-1 truncate">
									{t('commandPalette.results.messagePerson', { name: person.name })}
								</span>
							</CommandItem>
						);
					})}
				</CommandGroup>
			)}
		</>
	);
}
