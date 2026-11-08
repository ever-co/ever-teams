'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { APP_NAME } from '@/core/constants/config/constants';
import { ArrowUpRight, Gift, InformationCircle, Refresh } from '@/core/components/icons';
import { SheetDescription, SheetHeader, SheetTitle } from '@/core/components/common/sheet';
import { Button } from '@/core/components/duplicated-components/_button';
import { isUnseenEntry } from '@/core/lib/whats-new';
import type { ChangelogEntry } from '@/core/services/client/api/changelog.service';
import { cn } from '@/core/lib/helpers';
import { ChangelogIcon } from './changelog-icon';

/** Where the panel's footer leads: the version and links of this deployment. */
export const ABOUT_PAGE_HREF = '/about';

type WhatsNewPanelProps = Readonly<{
	entries: readonly ChangelogEntry[];
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	/** The newest date the user had seen before this opening: newer entries carry a "New" mark. */
	seenAt: string | null;
	/** Closes the sheet, as following the About link should. */
	onNavigate?: () => void;
}>;

function EntriesSkeleton() {
	return (
		<ul aria-hidden="true" className="flex flex-col gap-5">
			{[0, 1, 2].map((row) => (
				<li key={row} className="flex gap-3">
					<span className="size-9 shrink-0 animate-pulse rounded-xl bg-foreground/[0.06]" />
					<span className="flex flex-1 flex-col gap-2 pt-1">
						<span className="h-3.5 w-2/3 animate-pulse rounded bg-foreground/[0.06]" />
						<span className="h-3 w-1/3 animate-pulse rounded bg-foreground/[0.04]" />
						<span className="h-3 w-full animate-pulse rounded bg-foreground/[0.04]" />
					</span>
				</li>
			))}
		</ul>
	);
}

function PanelState({
	title,
	description,
	action
}: Readonly<{ title: string; description?: string; action?: ReactNode }>) {
	return (
		<div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
			<span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Gift className="size-5" aria-hidden="true" />
			</span>
			<p className="text-sm font-medium text-foreground">{title}</p>
			{description && <p className="max-w-[18rem] text-xs text-muted-foreground">{description}</p>}
			{action}
		</div>
	);
}

function EntryItem({ entry, isNew }: Readonly<{ entry: ChangelogEntry; isNew: boolean }>) {
	const t = useTranslations();
	const format = useFormatter();

	return (
		<li className="group relative flex gap-3">
			<span
				className={cn(
					'flex size-9 shrink-0 items-center justify-center rounded-xl',
					isNew ? 'bg-primary/10 text-primary' : 'bg-foreground/[0.05] text-muted-foreground'
				)}
			>
				<ChangelogIcon name={entry.icon} className="size-[18px]" />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
					{isNew && (
						<span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold uppercase leading-4 tracking-wide text-primary-foreground">
							{t('whatsNew.NEW')}
						</span>
					)}
				</div>
				<time dateTime={entry.date} className="text-xs text-muted-foreground">
					{format.dateTime(new Date(entry.date), { dateStyle: 'medium', timeZone: 'UTC' })}
				</time>
				<p className="text-sm leading-relaxed text-muted-foreground">{entry.content}</p>
				{entry.learnMoreUrl && (
					<a
						href={entry.learnMoreUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
					>
						{t('whatsNew.LEARN_MORE')}
						<ArrowUpRight className="size-3" aria-hidden="true" />
					</a>
				)}
			</div>
		</li>
	);
}

/** The body of the "What's new" sheet: the product's latest updates, newest first. */
export function WhatsNewPanel({ entries, isLoading, isError, onRetry, seenAt, onNavigate }: WhatsNewPanelProps) {
	const t = useTranslations();

	let body: ReactNode;
	if (isLoading) {
		body = <EntriesSkeleton />;
	} else if (isError && entries.length === 0) {
		body = (
			<PanelState
				title={t('whatsNew.ERROR')}
				action={
					<Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={onRetry}>
						<Refresh className="size-3.5" aria-hidden="true" />
						{t('whatsNew.RETRY')}
					</Button>
				}
			/>
		);
	} else if (entries.length === 0) {
		body = <PanelState title={t('whatsNew.EMPTY_TITLE')} description={t('whatsNew.EMPTY_DESCRIPTION')} />;
	} else {
		body = (
			<ol className="flex flex-col gap-6">
				{entries.map((entry) => (
					<EntryItem key={entry.id} entry={entry} isNew={isUnseenEntry(entry, seenAt)} />
				))}
			</ol>
		);
	}

	return (
		<>
			<SheetHeader className="hairline-b border-border px-5 pt-5 pb-4 pr-12 text-left">
				<SheetTitle className="flex items-center gap-2 text-base">
					<Gift className="size-4 text-primary" aria-hidden="true" />
					{t('whatsNew.TITLE')}
				</SheetTitle>
				<SheetDescription>{t('whatsNew.DESCRIPTION', { appName: APP_NAME })}</SheetDescription>
			</SheetHeader>
			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{body}</div>
			<div className="hairline-t border-border px-5 py-3">
				<Link
					href={ABOUT_PAGE_HREF}
					onClick={onNavigate}
					className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
				>
					<InformationCircle className="size-3.5" aria-hidden="true" />
					{t('whatsNew.ABOUT_LINK', { appName: APP_NAME })}
				</Link>
			</div>
		</>
	);
}
