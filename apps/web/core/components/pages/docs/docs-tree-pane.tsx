'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { ChevronRight, CircleAlert, Home, Lock, Plus, Refresh, Search, Trash, X } from '@/core/components/icons';
import { useDocsSearch } from '@/core/hooks/docs/use-docs-search';
import type { DocsTreeState } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { filterPagesLocally, pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { DocsPageGlyph } from './docs-page-glyph';
import { DocsTree, type DocsTreeActions } from './docs-tree';

interface DocsTreePaneProps {
	tree: DocsTreeState;
	activeId: string | null;
	expanded: ReadonlySet<string>;
	onToggle: (pageId: string) => void;
	onSetOpen: (pageId: string, open: boolean) => void;
	favoriteIds: ReadonlySet<string>;
	recentIds: readonly string[];
	actions: DocsTreeActions;
	onNewPage: (parentId: string | null, visibility: EDocumentVisibility) => void;
	/** The Home row was picked: where the tree covers the home (a phone), the page shows the home in its place. */
	onHome?: () => void;
}

/** A row of the pane that is a place, not a page: the home, the trash. */
const PLACE_ROW =
	'flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4 [&_svg]:shrink-0';

/** The left pane: the home, search, favourites, the workspace tree, the private tree, recent pages and the trash. */
export function DocsTreePane({ tree, activeId, expanded, onToggle, onSetOpen, favoriteIds, recentIds, actions, onNewPage, onHome }: DocsTreePaneProps) {
	const t = useTranslations();
	const pathname = usePathname();
	const [query, setQuery] = useState('');
	const search = useDocsSearch(query, true);
	const [closedSections, setClosedSections] = useState<Set<string>>(() => new Set());

	const favorites = useMemo(() => [...favoriteIds].map((id) => tree.byId.get(id)).filter((page): page is IDocumentPage => !!page), [favoriteIds, tree.byId]);
	const recent = useMemo(() => recentIds.map((id) => tree.byId.get(id)).filter((page): page is IDocumentPage => !!page).slice(0, 5), [recentIds, tree.byId]);

	const searchRows = useMemo(() => {
		if (!search.isActive) return [];
		const local = filterPagesLocally(tree.pages, search.query);
		const seen = new Set(local.map((page) => page.id));
		return [...local, ...search.results.filter((page) => !seen.has(page.id))];
	}, [search.isActive, search.query, search.results, tree.pages]);

	const toggleSection = (key: string) =>
		setClosedSections((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const isTrashActive = pathname?.endsWith('/docs/trash') ?? false;
	const isHomeActive = activeId === null && !isTrashActive;
	const isReady = !tree.isLoading && !tree.isError;

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<div className="flex shrink-0 flex-col gap-2 px-3 pb-2 pt-3">
				<div className="flex items-center gap-1">
					<h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-foreground">{t('docs.TITLE')}</h2>
					<Button
						type="button"
						size="icon-sm"
						onClick={() => onNewPage(null, EDocumentVisibility.ORGANIZATION)}
						aria-label={t('docs.NEW_PAGE')}
						title={t('docs.NEW_PAGE')}
					>
						<Plus className="size-4" />
					</Button>
				</div>
				<div className="relative">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t('docs.SEARCH_PAGES')}
						aria-label={t('docs.SEARCH_PAGES')}
						className="h-8 pl-8 pr-7 text-[13px]"
					/>
					{query.length > 0 && (
						<button
							type="button"
							onClick={() => setQuery('')}
							aria-label={t('docs.CLEAR_SEARCH')}
							className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
				{search.isActive ? (
					<section aria-label={t('docs.SEARCH_RESULTS')}>
						<SectionHeader label={t('docs.SEARCH_RESULTS')} count={searchRows.length} />
						{search.isSearching && searchRows.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('docs.SEARCHING')}</p>}
						{!search.isSearching && searchRows.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('docs.NO_MATCHES')}</p>}
						<ul className="flex flex-col gap-px">
							{searchRows.map((page) => (
								<FlatRow key={page.id} page={page} isActive={page.id === activeId} untitled={t('docs.UNTITLED')} privateLabel={t('docs.PRIVATE_PAGE')} />
							))}
						</ul>
					</section>
				) : (
					<>
						<Link
							href="/docs?tree=1"
							onClick={onHome}
							aria-current={isHomeActive ? 'page' : undefined}
							className={cn(PLACE_ROW, 'mb-1', isHomeActive ? 'bg-foreground/[0.07] font-medium text-foreground' : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground')}
						>
							<Home aria-hidden="true" />
							{t('docs.HOME')}
						</Link>
						{favorites.length > 0 && (
							<Section id="favorites" label={t('docs.FAVORITES')} closed={closedSections} onToggle={toggleSection}>
								<ul className="flex flex-col gap-px">
									{favorites.map((page) => (
										<FlatRow key={page.id} page={page} isActive={page.id === activeId} untitled={t('docs.UNTITLED')} privateLabel={t('docs.PRIVATE_PAGE')} />
									))}
								</ul>
							</Section>
						)}
						<Section
							id="workspace"
							label={t('docs.WORKSPACE')}
							closed={closedSections}
							onToggle={toggleSection}
							action={<SectionAction label={t('docs.NEW_PAGE')} onClick={() => onNewPage(null, EDocumentVisibility.ORGANIZATION)} />}
						>
							{tree.isLoading && <TreeRowsSkeleton />}
							{tree.isError && (
								<div role="alert" className="mx-1 my-1 flex flex-col items-start gap-2 rounded-lg bg-destructive/[0.06] p-3">
									<p className="flex items-start gap-2 text-xs text-foreground">
										<CircleAlert className="mt-px size-3.5 shrink-0 text-destructive" aria-hidden="true" />
										{t('docs.LOAD_ERROR')}
									</p>
									<Button type="button" variant="outline" size="sm" onClick={() => tree.retry()}>
										<Refresh className="size-3.5" />
										{t('docs.RETRY')}
									</Button>
								</div>
							)}
							{isReady && (
								<DocsTree
									tree={tree.workspaceTree}
									activeId={activeId}
									expanded={expanded}
									favoriteIds={favoriteIds}
									onToggle={onToggle}
									onSetOpen={onSetOpen}
									actions={actions}
									label={t('docs.WORKSPACE')}
									emptyText={t('docs.WORKSPACE_EMPTY')}
								/>
							)}
						</Section>
						{isReady && (
							<Section
								id="private"
								label={t('docs.PRIVATE')}
								closed={closedSections}
								onToggle={toggleSection}
								action={<SectionAction label={t('docs.NEW_PRIVATE_PAGE')} onClick={() => onNewPage(null, EDocumentVisibility.PRIVATE)} />}
							>
								<DocsTree
									tree={tree.privateTree}
									activeId={activeId}
									expanded={expanded}
									favoriteIds={favoriteIds}
									onToggle={onToggle}
									onSetOpen={onSetOpen}
									actions={actions}
									label={t('docs.PRIVATE')}
									emptyText={t('docs.PRIVATE_EMPTY')}
								/>
							</Section>
						)}
						{recent.length > 0 && (
							<Section id="recent" label={t('docs.RECENT')} closed={closedSections} onToggle={toggleSection}>
								<ul className="flex flex-col gap-px">
									{recent.map((page) => (
										<FlatRow key={page.id} page={page} isActive={page.id === activeId} untitled={t('docs.UNTITLED')} privateLabel={t('docs.PRIVATE_PAGE')} />
									))}
								</ul>
							</Section>
						)}
					</>
				)}
			</div>
			<div className="shrink-0 px-2 py-2 hairline-t border-border">
				<Link
					href="/docs/trash"
					aria-current={isTrashActive ? 'page' : undefined}
					className={cn(PLACE_ROW, isTrashActive ? 'bg-foreground/[0.07] font-medium text-foreground' : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground')}
				>
					<Trash aria-hidden="true" />
					{t('docs.TRASH')}
				</Link>
			</div>
		</div>
	);
}

function SectionHeader({ label, count }: Readonly<{ label: string; count?: number }>) {
	return (
		<h3 className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
			{label}
			{count !== undefined && <span className="font-normal tabular-nums">{count}</span>}
		</h3>
	);
}

function Section({
	id,
	label,
	closed,
	onToggle,
	action,
	children
}: Readonly<{ id: string; label: string; closed: ReadonlySet<string>; onToggle: (id: string) => void; action?: ReactNode; children: ReactNode }>) {
	const isOpen = !closed.has(id);
	return (
		<section className="mb-1">
			<div className="group flex h-7 items-center">
				<button
					type="button"
					onClick={() => onToggle(id)}
					aria-expanded={isOpen}
					className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<ChevronRight className={cn('size-3 transition-transform rtl:rotate-180', isOpen && 'rotate-90 rtl:rotate-90')} aria-hidden="true" />
					<span className="truncate">{label}</span>
				</button>
				{action && <div className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">{action}</div>}
			</div>
			{isOpen && <div className="mt-px">{children}</div>}
		</section>
	);
}

function SectionAction({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-foreground/[0.08] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<Plus className="size-3.5" />
		</button>
	);
}

function FlatRow({ page, isActive, untitled, privateLabel }: Readonly<{ page: IDocumentPage; isActive: boolean; untitled: string; privateLabel: string }>) {
	return (
		<li>
			<Link
				href={`/docs/${encodeURIComponent(page.id)}`}
				aria-current={isActive ? 'page' : undefined}
				className={cn(
					'flex h-8 items-center gap-1.5 rounded-lg pl-2 pr-2 text-[13px] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
					isActive ? 'bg-foreground/[0.07] font-medium text-foreground' : 'text-foreground/85 hover:bg-foreground/[0.04]'
				)}
			>
				<DocsPageGlyph page={page} />
				<span className="min-w-0 flex-1 truncate">{pageTitle(page, untitled)}</span>
				{page.visibility === EDocumentVisibility.PRIVATE && <Lock className="size-3 shrink-0 text-muted-foreground" aria-label={privateLabel} />}
			</Link>
		</li>
	);
}

/** The tree while it loads: rows of its own height, indented like a small tree. */
function TreeRowsSkeleton() {
	const rows: Array<{ indent: number; width: string }> = [
		{ indent: 0, width: 'w-3/5' },
		{ indent: 1, width: 'w-1/2' },
		{ indent: 1, width: 'w-2/5' },
		{ indent: 0, width: 'w-2/3' },
		{ indent: 0, width: 'w-1/3' }
	];
	return (
		<div aria-hidden="true" className="flex flex-col gap-px">
			{rows.map((row, at) => (
				<div key={at} className="flex h-8 items-center gap-2 px-2" style={{ paddingInlineStart: `${8 + row.indent * 14}px` }}>
					<span className="size-4 shrink-0 animate-pulse rounded bg-foreground/[0.06]" />
					<span className={cn('h-2.5 animate-pulse rounded-full bg-foreground/[0.06]', row.width)} />
				</div>
			))}
		</div>
	);
}
