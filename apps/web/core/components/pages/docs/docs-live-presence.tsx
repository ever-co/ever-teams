'use client';

import { useTranslations } from 'next-intl';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import type { DocsLiveFallbackReason, DocsLivePeer, DocsLiveState } from '@/core/lib/docs-live/binding';
import { DOCS_LIVE_REASONS } from '@/core/lib/docs-live/protocol';

/** The co-editors shown in the header before the rest is a count. */
const MAX_SHOWN_PEERS = 4;

/** Why the live page is read-only, as a sentence; `null` when it is not. */
export function useLiveReadOnlyText(reason: string | null | undefined): string | null {
	const t = useTranslations();
	if (reason === undefined || reason === null) return null;
	switch (reason) {
		case DOCS_LIVE_REASONS.NO_WRITE_ACCESS:
			return t('docs.LIVE_READ_ONLY_NO_ACCESS');
		case DOCS_LIVE_REASONS.LOCKED:
			return t('docs.LOCKED_NOTICE');
		case DOCS_LIVE_REASONS.SESSION_LIMIT:
			return t('docs.LIVE_READ_ONLY_FULL');
		case DOCS_LIVE_REASONS.SIZE_LIMIT:
			return t('docs.TOO_LARGE');
		default:
			return t('docs.LIVE_READ_ONLY');
	}
}

/** Why live editing stopped, for the "Not live" label's title. */
function useFallbackText(reason: DocsLiveFallbackReason | null): string {
	const t = useTranslations();
	switch (reason) {
		case DOCS_LIVE_REASONS.ACCESS_REVOKED:
			return t('docs.LIVE_ENDED_ACCESS');
		case DOCS_LIVE_REASONS.TRASHED:
			return t('docs.IN_TRASH_NOTICE');
		case 'unsupported':
			return t('docs.UNSUPPORTED_CONTENT');
		default:
			return t('docs.LIVE_ENDED');
	}
}

/**
 * Where the page's live session stands, in the header: "Live" with the faces of whoever else has the page open,
 * "Reconnecting…" while the session is down (what is typed is sent once it is back), "Not live" once live editing
 * stopped and the autosave saves the page.
 */
export function DocsLiveStatusLabel({
	mode,
	synced,
	peers,
	fallbackReason
}: Readonly<{
	mode: DocsLiveState;
	synced: boolean;
	peers: readonly DocsLivePeer[];
	fallbackReason: DocsLiveFallbackReason | null;
}>) {
	const t = useTranslations();
	const fallbackText = useFallbackText(fallbackReason);
	if (mode === 'fallback') {
		return (
			<span
				title={fallbackText}
				className="mr-1 inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
			>
				<span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
				<span>{t('docs.NOT_LIVE')}</span>
			</span>
		);
	}
	if (mode === 'connecting' || !synced) {
		return (
			<span
				role="status"
				aria-live="polite"
				className="mr-1 inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
			>
				<span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" aria-hidden="true" />
				<span className="hidden sm:inline">{t('docs.LIVE_CONNECTING')}</span>
			</span>
		);
	}
	const reconnecting = mode === 'reconnecting';
	return (
		<span className="mr-1 inline-flex shrink-0 items-center gap-2">
			{peers.length > 0 && (
				<span
					role="group"
					aria-label={t('docs.LIVE_EDITORS', { count: peers.length })}
					className="flex items-center"
				>
					<AvatarStack
						people={peers.map((peer) => ({ id: peer.id, name: peer.name, imageUrl: peer.imageUrl }))}
						max={MAX_SHOWN_PEERS}
					/>
				</span>
			)}
			<span
				role="status"
				aria-live="polite"
				className={cn(
					'inline-flex items-center gap-1.5 text-xs',
					reconnecting ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
				)}
			>
				<span
					className={cn(
						'size-1.5 rounded-full',
						reconnecting ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
					)}
					aria-hidden="true"
				/>
				<span>{reconnecting ? t('docs.LIVE_RECONNECTING') : t('docs.LIVE')}</span>
			</span>
		</span>
	);
}
