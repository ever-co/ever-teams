'use client';

import { useTranslations } from 'next-intl';
import { useChatPeople } from '@/core/hooks/chat/use-chat-scope';
import { useChatTypists } from '@/core/hooks/chat/use-chat-typing';
import { cn } from '@/core/lib/helpers';
import { typingLineOf } from '@/core/lib/utils/chat-typing';

/**
 * "Anna is typing…", "Anna and Ben are typing…", "Several people are typing…": a quiet line under the composer box,
 * for the conversation (`threadRootId` left out) or one of its threads. It listens on its own, so a signal every few
 * seconds renders this line and not the pane around it. The live region is always there, so a screen reader hears the
 * line when it changes, politely; the dots stand still for a reader who asked for less motion.
 */
export function ChatTypingLine({
	conversationId,
	threadRootId = null,
	className
}: Readonly<{ conversationId: string; threadRootId?: string | null; className?: string }>) {
	const t = useTranslations();
	const people = useChatPeople();
	const typists = useChatTypists(conversationId, threadRootId);
	const names = typists.map(
		(typist) =>
			people.byUser.get(typist.userId)?.name ||
			(typist.employeeId ? people.byEmployee.get(typist.employeeId)?.name : undefined) ||
			t('teamChat.SOMEONE')
	);
	const line = typingLineOf(names);
	let text = '';
	if (line?.key === 'TYPING_ONE') text = t('teamChat.TYPING_ONE', line.values);
	else if (line?.key === 'TYPING_TWO') text = t('teamChat.TYPING_TWO', line.values);
	else if (line?.key === 'TYPING_SEVERAL') text = t('teamChat.TYPING_SEVERAL');

	return (
		<span aria-live="polite" className={cn('inline-flex min-w-0 items-center gap-1.5 text-muted-foreground', className)} data-testid="chat-typing-line">
			{text && (
				<>
					<span aria-hidden="true" className="inline-flex shrink-0 items-center gap-0.5">
						{[0, 1, 2].map((dot) => (
							<span
								key={dot}
								className="size-1 rounded-full bg-current animate-pulse motion-reduce:animate-none"
								style={{ animationDelay: `${dot * 160}ms` }}
							/>
						))}
					</span>
					<span className="min-w-0 truncate">{text}</span>
				</>
			)}
		</span>
	);
}
