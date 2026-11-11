'use client';

import { memo, useId, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/core/components/icons';
import { useChatLinkPreviews } from '@/core/hooks/chat/use-chat-link-previews';
import { previewLinksOf, type ChatLinkPreviewCard, type ChatPreviewLink } from '@/core/lib/utils/chat-link-preview';

/** This app's own address: its links (a message, a task) open its own pages and get no card. */
function ownOrigin(): string | null {
	return typeof window === 'undefined' ? null : window.location.origin;
}

/**
 * One link's card: the site's name and its host, the page's title and two lines of its description. Text only: the
 * page's picture and icon live on the linked site's hosts, and drawing them would make the reader's browser call that
 * site. The card is one link, named by the title and the host; every text is the platform's plain text.
 */
function LinkPreviewCard({ card }: Readonly<{ card: ChatLinkPreviewCard }>) {
	const t = useTranslations();
	const descriptionId = useId();

	return (
		<a
			href={card.href}
			target="_blank"
			rel="noopener noreferrer nofollow"
			aria-label={
				card.title
					? t('teamChat.LINK_PREVIEW_LABEL', { title: card.title, site: card.host })
					: t('teamChat.LINK_PREVIEW_SITE_LABEL', { site: card.host })
			}
			aria-describedby={card.description ? descriptionId : undefined}
			className="group/preview flex w-full max-w-md flex-col gap-0.5 rounded-lg bg-card px-2.5 py-2 text-start outline-none hairline-ring ring-border transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			data-link-preview={card.href}
		>
			<span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
				<Link className="size-3 shrink-0" aria-hidden="true" />
				{/* The page's own name for its site, then always the host the card opens. */}
				{card.siteName && (
					<>
						<span className="min-w-0 shrink-[3] truncate font-medium text-foreground/80" dir="auto">
							{card.siteName}
						</span>
						<span aria-hidden="true">·</span>
					</>
				)}
				<span className="min-w-0 truncate" dir="ltr">
					{card.host}
				</span>
			</span>
			{card.title && (
				<span
					className="line-clamp-2 text-[13px] font-medium leading-snug text-primary underline-offset-2 [overflow-wrap:anywhere] group-hover/preview:underline"
					dir="auto"
				>
					{card.title}
				</span>
			)}
			{card.description && (
				<span
					id={descriptionId}
					className="line-clamp-2 text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]"
					dir="auto"
				>
					{card.description}
				</span>
			)}
		</a>
	);
}

function LinkPreviewCards({ links }: Readonly<{ links: readonly ChatPreviewLink[] }>) {
	const cards = useChatLinkPreviews(links);
	if (!cards.length) return null;
	return (
		<div className="mt-1.5 flex flex-col gap-1.5">
			{cards.map((card) => (
				<LinkPreviewCard key={card.href} card={card} />
			))}
		</div>
	);
}

/**
 * The preview cards under a message, one per link it carries (three at most, code left out), from what the platform
 * fetched. Only mounted with `NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED` on; a link without a preview stays plain.
 */
function MessageLinkPreviewsComponent({ body }: Readonly<{ body: string }>) {
	const links = useMemo(() => previewLinksOf(body, { ownOrigin: ownOrigin() }), [body]);
	if (!links.length) return null;
	return <LinkPreviewCards links={links} />;
}

export const MessageLinkPreviews = memo(MessageLinkPreviewsComponent);
