import { ChatListSkeleton, ChatMessagesSkeleton } from './chat-states';

/** A conversation pane while it loads: its top bar, messages taking shape from the bottom up, and the composer's box. */
export function ConversationPaneSkeleton() {
	return (
		<div aria-hidden="true" className="flex h-full min-h-0 flex-col">
			<div className="flex h-12 shrink-0 items-center gap-2 border-border px-3 hairline-b">
				<span className="size-7 animate-pulse rounded-lg bg-foreground/[0.06]" />
				<span className="h-3 w-32 animate-pulse rounded-full bg-foreground/[0.07]" />
				<span className="hidden h-2.5 w-48 animate-pulse rounded-full bg-foreground/[0.04] md:block" />
			</div>
			<div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
				<ChatMessagesSkeleton rows={7} />
			</div>
			<div className="shrink-0 px-4 pb-3 pt-1">
				<div className="h-[76px] rounded-xl bg-card hairline-ring ring-border" />
				<div className="h-5" />
			</div>
		</div>
	);
}

/** The page while its code or its first data loads: the list pane beside a conversation, both in outline. */
export function ChatPageSkeleton() {
	return (
		<div aria-hidden="true" className="flex h-full min-h-0">
			<div className="hidden w-72 shrink-0 border-e border-border lg:block">
				<div className="flex flex-col gap-2 px-3 pb-2 pt-3">
					<div className="flex h-7 items-center justify-between px-1">
						<span className="h-3.5 w-14 animate-pulse rounded-full bg-foreground/[0.07]" />
						<span className="size-7 animate-pulse rounded-full bg-foreground/[0.06]" />
					</div>
					<div className="h-8 rounded-md bg-foreground/[0.04]" />
				</div>
				<div className="px-2">
					<ChatListSkeleton />
				</div>
			</div>
			<div className="min-w-0 flex-1">
				<ConversationPaneSkeleton />
			</div>
		</div>
	);
}
