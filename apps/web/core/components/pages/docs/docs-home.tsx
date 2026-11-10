'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowLeft, ChevronRight, CircleAlert, Clock, FileText, Folder, Lock, Plus, Refresh, Star } from '@/core/components/icons';
import type { DocsTreeState } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { DOCS_TEMPLATES, buildTemplateContent, type DocsTemplateContent, type DocsTemplateId } from '@/core/lib/utils/docs-templates';
import { pageTitle, sortByUpdated } from '@/core/lib/utils/docs-tree';
import { formatNotificationAge, formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { EDocumentKind, EDocumentVisibility } from '@/core/types/interfaces/common/docs';
import { DocsPageGlyph } from './docs-page-glyph';

/** How many pages the home lists under "Recently updated". */
const RECENT_ROWS = 8;

/** The section headings of each template, in the reader's language. */
const TEMPLATE_SECTIONS: Record<DocsTemplateId, readonly DottedLanguageObjectStringPaths[]> = {
	meeting: ['docs.TEMPLATES.MEETING.ATTENDEES', 'docs.TEMPLATES.MEETING.AGENDA', 'docs.TEMPLATES.MEETING.NOTES', 'docs.TEMPLATES.MEETING.ACTION_ITEMS'],
	brief: [
		'docs.TEMPLATES.BRIEF.GOAL',
		'docs.TEMPLATES.BRIEF.BACKGROUND',
		'docs.TEMPLATES.BRIEF.SCOPE',
		'docs.TEMPLATES.BRIEF.MILESTONES',
		'docs.TEMPLATES.BRIEF.OPEN_QUESTIONS'
	],
	decision: ['docs.TEMPLATES.DECISION.CONTEXT', 'docs.TEMPLATES.DECISION.OPTIONS', 'docs.TEMPLATES.DECISION.DECISION', 'docs.TEMPLATES.DECISION.CONSEQUENCES']
};

const TEMPLATE_NAMES: Record<DocsTemplateId, { name: DottedLanguageObjectStringPaths; text: DottedLanguageObjectStringPaths }> = {
	meeting: { name: 'docs.TEMPLATES.MEETING.NAME', text: 'docs.TEMPLATES.MEETING.TEXT' },
	brief: { name: 'docs.TEMPLATES.BRIEF.NAME', text: 'docs.TEMPLATES.BRIEF.TEXT' },
	decision: { name: 'docs.TEMPLATES.DECISION.NAME', text: 'docs.TEMPLATES.DECISION.TEXT' }
};

/** What the home asks for when a person starts a page. */
export interface DocsNewPageRequest {
	visibility: EDocumentVisibility;
	name?: string;
	icon?: string;
	content?: DocsTemplateContent;
}

interface DocsHomeProps {
	tree: DocsTreeState;
	favoriteIds: ReadonlySet<string>;
	onNewPage: (request: DocsNewPageRequest) => Promise<void>;
	/** Back to the tree, where the home covers it (a phone). */
	onBack?: () => void;
}

/**
 * What `/docs` shows beside the tree when no page is open: the ways to start a page (empty, private, or from a
 * template), the pages changed last, and the favourites.
 */
export function DocsHome({ tree, favoriteIds, onNewPage, onBack }: DocsHomeProps) {
	const t = useTranslations();
	const locale = useLocale();
	const [now] = useState(() => new Date());
	const [busy, setBusy] = useState<string | null>(null);

	const recent = useMemo(() => sortByUpdated(tree.pages.filter((page) => page.kind === EDocumentKind.PAGE)).slice(0, RECENT_ROWS), [tree.pages]);
	const favorites = useMemo(() => tree.pages.filter((page) => favoriteIds.has(page.id)), [favoriteIds, tree.pages]);
	const pageCount = useMemo(() => tree.pages.filter((page) => page.kind === EDocumentKind.PAGE).length, [tree.pages]);

	const start = async (key: string, request: DocsNewPageRequest) => {
		if (busy) return;
		setBusy(key);
		try {
			await onNewPage(request);
		} finally {
			setBusy(null);
		}
	};

	const startFromTemplate = (id: DocsTemplateId) => {
		const template = DOCS_TEMPLATES.find((candidate) => candidate.id === id);
		if (!template) return;
		const sections = TEMPLATE_SECTIONS[id].map((key, at) => ({ heading: t(key), block: template.blocks[at] ?? 'text' }));
		void start(id, {
			visibility: EDocumentVisibility.ORGANIZATION,
			name: t(TEMPLATE_NAMES[id].name),
			icon: template.icon,
			content: buildTemplateContent(sections)
		});
	};

	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-12">
				<header className="flex flex-wrap items-center gap-4">
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							aria-label={t('docs.BACK')}
							className="-ms-2 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 lg:hidden"
						>
							<ArrowLeft className="size-4 rtl:rotate-180" />
						</button>
					)}
					<span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
						<FileText className="size-6" />
					</span>
					<div className="min-w-0 flex-1">
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('docs.TITLE')}</h1>
						<p className="text-sm text-muted-foreground text-balance">
							{t('docs.WELCOME_TITLE')}
							{!tree.isLoading && !tree.isError && pageCount > 0 && <span> · {t('docs.PAGE_COUNT', { count: pageCount })}</span>}
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						<Button type="button" variant="outline" disabled={busy !== null} onClick={() => void start('private', { visibility: EDocumentVisibility.PRIVATE })}>
							<Lock className="size-4" />
							{t('docs.NEW_PRIVATE_PAGE')}
						</Button>
						<Button type="button" disabled={busy !== null} onClick={() => void start('blank', { visibility: EDocumentVisibility.ORGANIZATION })}>
							<Plus className="size-4" />
							{t('docs.NEW_PAGE')}
						</Button>
					</div>
				</header>

				<section aria-labelledby="docs-home-templates">
					<SectionTitle id="docs-home-templates">{t('docs.TEMPLATES.TITLE')}</SectionTitle>
					<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<TemplateCard
							icon={<FileText className="size-5 text-muted-foreground" />}
							name={t('docs.TEMPLATES.BLANK.NAME')}
							text={t('docs.TEMPLATES.BLANK.TEXT')}
							isBusy={busy === 'blank'}
							disabled={busy !== null}
							onClick={() => void start('blank', { visibility: EDocumentVisibility.ORGANIZATION })}
						/>
						{DOCS_TEMPLATES.map((template) => (
							<TemplateCard
								key={template.id}
								icon={<span className="text-xl leading-none">{template.icon}</span>}
								name={t(TEMPLATE_NAMES[template.id].name)}
								text={t(TEMPLATE_NAMES[template.id].text)}
								isBusy={busy === template.id}
								disabled={busy !== null}
								onClick={() => startFromTemplate(template.id)}
							/>
						))}
					</ul>
				</section>

				{favorites.length > 0 && (
					<section aria-labelledby="docs-home-favorites">
						<SectionTitle id="docs-home-favorites" icon={<Star className="size-3.5" />}>
							{t('docs.FAVORITES')}
						</SectionTitle>
						<ul className="flex flex-wrap gap-2">
							{favorites.map((page) => (
								<li key={page.id}>
									<Link
										href={`/docs/${encodeURIComponent(page.id)}`}
										className="inline-flex max-w-64 items-center gap-2 rounded-full bg-card py-1.5 pl-2.5 pr-3.5 text-sm text-foreground outline-none hairline-ring ring-border transition-colors hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/25"
									>
										<DocsPageGlyph page={page} className="size-6 text-base" />
										<span className="truncate">{pageTitle(page, t('docs.UNTITLED'))}</span>
									</Link>
								</li>
							))}
						</ul>
					</section>
				)}

				<section aria-labelledby="docs-home-recent" aria-busy={tree.isLoading}>
					<SectionTitle id="docs-home-recent" icon={<Clock className="size-3.5" />}>
						{t('docs.RECENTLY_UPDATED')}
					</SectionTitle>
					<div className="overflow-hidden rounded-xl bg-card hairline-ring ring-border">
						{tree.isLoading && <HomeRowsSkeleton />}
						{tree.isError && (
							<div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-4 text-sm">
								<CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
								<p className="min-w-0 flex-1 text-muted-foreground">{t('docs.LOAD_ERROR')}</p>
								<Button type="button" variant="outline" size="sm" onClick={() => tree.retry()}>
									<Refresh className="size-3.5" />
									{t('docs.RETRY')}
								</Button>
							</div>
						)}
						{!tree.isLoading && !tree.isError && recent.length === 0 && (
							<div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
								<p className="text-sm font-medium text-foreground">{t('docs.PROJECT_PAGES_EMPTY_TITLE')}</p>
								<p className="text-sm text-muted-foreground text-balance">{t('docs.WORKSPACE_EMPTY')}</p>
							</div>
						)}
						{!tree.isLoading && !tree.isError && recent.length > 0 && (
							<ul className="hairline-divide-y divide-border">
								{recent.map((page) => {
									const parent = page.parentId ? tree.byId.get(page.parentId) : undefined;
									const updatedAt = new Date(page.updatedAt);
									return (
										<li key={page.id}>
											<Link
												href={`/docs/${encodeURIComponent(page.id)}`}
												className="group flex items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-foreground/[0.035] focus-visible:bg-foreground/[0.05]"
											>
												<DocsPageGlyph page={page} className="size-6 text-base" />
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-medium text-foreground">{pageTitle(page, t('docs.UNTITLED'))}</span>
													{parent && (
														<span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
															<Folder className="size-3 shrink-0" aria-hidden="true" />
															<span className="truncate">{pageTitle(parent, t('docs.UNTITLED'))}</span>
														</span>
													)}
												</span>
												{page.visibility === EDocumentVisibility.PRIVATE && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label={t('docs.PRIVATE_PAGE')} />}
												<time dateTime={page.updatedAt} title={formatNotificationDate(updatedAt, locale)} className="shrink-0 text-xs tabular-nums text-muted-foreground">
													{formatNotificationAge(updatedAt, locale, now)}
												</time>
												<ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

function SectionTitle({ id, icon, children }: Readonly<{ id: string; icon?: ReactNode; children: ReactNode }>) {
	return (
		<h2 id={id} className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
			{icon}
			{children}
		</h2>
	);
}

function TemplateCard({
	icon,
	name,
	text,
	isBusy,
	disabled,
	onClick
}: Readonly<{ icon: ReactNode; name: string; text: string; isBusy: boolean; disabled: boolean; onClick: () => void }>) {
	return (
		<li>
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				aria-busy={isBusy}
				className={cn(
					'group flex h-full w-full cursor-pointer flex-col items-start gap-3 rounded-xl bg-card p-4 text-left outline-none hairline-ring ring-border transition-[box-shadow,background-color,translate]',
					'hover:-translate-y-px hover:shadow-md hover:shadow-black/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none',
					disabled && !isBusy && 'opacity-60',
					isBusy && 'animate-pulse'
				)}
			>
				<span className="flex size-9 items-center justify-center rounded-lg bg-foreground/[0.05]" aria-hidden="true">
					{icon}
				</span>
				<span className="flex flex-col gap-0.5">
					<span className="text-sm font-medium text-foreground">{name}</span>
					<span className="text-xs text-muted-foreground text-balance">{text}</span>
				</span>
			</button>
		</li>
	);
}

function HomeRowsSkeleton() {
	const widths = ['w-2/5', 'w-1/2', 'w-1/3', 'w-3/5'];
	return (
		<div aria-hidden="true" className="hairline-divide-y divide-border">
			{widths.map((width) => (
				<div key={width} className="flex items-center gap-3 px-4 py-3">
					<span className="size-6 shrink-0 animate-pulse rounded-md bg-foreground/[0.06]" />
					<span className={cn('h-3 animate-pulse rounded-full bg-foreground/[0.06]', width)} />
					<span className="ml-auto h-3 w-10 animate-pulse rounded-full bg-foreground/[0.04]" />
				</div>
			))}
		</div>
	);
}
