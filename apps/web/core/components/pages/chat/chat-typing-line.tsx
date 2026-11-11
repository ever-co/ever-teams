'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import type { ChatPerson } from '@/core/lib/utils/chat-format';
import { typingLineOf, type ChatTypist } from '@/core/lib/utils/chat-typing';

/**
 * "Anna is typing…", "Anna and Ben are typing…", "Several people are typing…": a quiet line under the composer box.
 * The live region is always there, so a screen reader hears the line when it changes, politely; the dots stand still
 * for a reader who asked for less motion.
 */
export function ChatTypingLine({
	typists,
	peopleByUser,
	peopleByEmployee,
	className
}: Readonly<{
	typists: readonly ChatTypist[];
	peopleByUser: ReadonlyMap<string, ChatPerson>;
	peopleByEmployee: ReadonlyMap<string, ChatPerson>;
	className?: string;
}>) {
	const t = useTranslations();
	const names = typists.map(
		(typist) =>
			peopleByUser.get(typist.userId)?.name ||
			(typist.employeeId ? peopleByEmployee.get(typist.employeeId)?.name : undefined) ||
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
