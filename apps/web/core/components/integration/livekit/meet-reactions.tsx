'use client';

import type { ShownReaction } from '@/core/hooks/meetings/use-meeting-reactions';

/** The reactions of the last seconds over the room, each with who sent it; screen readers hear them as they come. */
export function MeetReactions({ reactions }: Readonly<{ reactions: ShownReaction[] }>) {
	return (
		<div
			aria-live="polite"
			data-testid="meet-reactions"
			className="pointer-events-none absolute bottom-24 left-4 z-10 flex flex-col items-start gap-2"
		>
			{reactions.map((reaction) => (
				<span
					key={reaction.id}
					className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
				>
					<span className="text-2xl leading-none">{reaction.emoji}</span>
					{reaction.name && <span className="max-w-40 truncate">{reaction.name}</span>}
				</span>
			))}
		</div>
	);
}
