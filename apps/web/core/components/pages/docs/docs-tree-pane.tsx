'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { ChevronRight, FileText, Plus, Search, Trash, X } from '@/core/components/icons';
import { useDocsSearch } from '@/core/hooks/docs/use-docs-search';
import type { DocsTreeState } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { filterPagesLocally, pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
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
}

/** The left pane: search, favourites, the workspace tree, the private tree, recent pages and the trash. */
export function DocsTreePane({ tree, activeId, expanded, onToggle, onSetOpen, favoriteIds, recentIds, actions, onNewPage }: DocsTreePaneProps) {
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

	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
				<div className="relative min-w-0 flex-1">
					<Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t('docs.SEARCH_PAGES')}
						aria-label={t('docs.SEARCH_PAGES')}
						className="h-8 pl-7 pr-7 text-sm"
					/>
					{query && (
						<button
							type="button"
							onClick={() => setQuery('')}
							aria-label={t('docs.CLEAR_SEARCH')}
							className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
				<button
					type="button"
					onClick={() => onNewPage(null, EDocumentVisibility.ORGANIZATION)}
					aria-label={t('docs.NEW_PAGE')}
					title={t('docs.NEW_PAGE')}
					className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
				>
					<Plus className="size-4" />
				</button>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto p-2">
				{search.isActive ? (
					<section aria-label={t('docs.SEARCH_RESULTS')}>
						<SectionHeader label={t('docs.SEARCH_RESULTS')} count={searchRows.length} />
						{search.isSearching && searchRows.length === 0 && <p className="px-3 py-1.5 text-xs text-muted-foreground">{t('docs.SEARCHING')}</p>}
						{!search.isSearching && searchRows.length === 0 && <p className="px-3 py-1.5 text-xs text-muted-foreground">{t('docs.NO_MATCHES')}</p>}
						<ul className="flex flex-col gap-px">
							{searchRows.map((page) => (
								<FlatRow key={page.id} page={page} isActive={page.id === activeId} untitled={t('docs.UNTITLED')} />
							))}
						</ul>
					</section>
				) : (
					<>
						{favorites.length > 0 && (
							<Section id="favorites" label={t('docs.FAVORITES')} closed={closedSections} onToggle={toggleSection}>
								<ul className="flex flex-col gap-px">
									{favorites.map((page) => (
										<FlatRow key={page.id} page={page} isActive={page.id === activeId} untitled={t('docs.UNTITLED')} />
									))}
								</ul>
							</Section>
						)}
						<Section
							id="workspace"
							label={t('docs.WORKSPACE')}
							closed={closedSections}
							onToggle={toggleSection}
							action={
								<SectionAction label={t('docs.NEW_PAGE')} onClick={() => onNewPage(null, EDocumentVisibility.ORGANIZATION)} />
							}
						>
							{tree.isLoading && <p className="px-3 py-1.5 text-xs text-muted-foreground">{t('docs.LOADING')}</p>}
							{tree.isError && (
								<button type="button" onClick={() => tree.retry()} className="px-3 py-1.5 text-left text-xs text-destructive underline-offset-2 hover:underline">
									{t('docs.LOAD_ERROR_RETRY')}
								</button>
							)}
							{!tree.isLoading && !tree.isError && (
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
						<Section
							id="private"
							label={t('docs.PRIVATE')}
							closed={closedSections}
							onToggle={toggleSection}
							action={<SectionAction label={t('docs.NEW_PRIVATE_PAGE')} onClick={() => onNewPage(null, EDocumentVisibility.PRIVATE)} />}
						>
							{!tree.isLoading && !tree.isError && (
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
							)}
						</Section>
						{recent.length > 0 && (
							<Section id="recent" label={t('docs.RECENT')} closed={closedSections} onToggle={toggleSection}>
								<ul className="flex flex-col gap-px">
									{recent.map((page) => (
										<FlatRow key={page.id} page={page} isActive={page.id === activeId} untitled={t('docs.UNTITLED')} />
									))}
								</ul>
							</Section>
						)}
						<div className="mt-2 border-t border-border pt-2">
							<Link
								href="/docs/trash"
								aria-current={isTrashActive ? 'page' : undefined}
								className={cn(
									'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
									isTrashActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground'
								)}
							>
								<Trash className="size-4" aria-hidden="true" />
								{t('docs.TRASH')}
							</Link>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function SectionHeader({ label, count }: Readonly<{ label: string; count?: number }>) {
	return (
		<h3 className="flex items-center gap-1 px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
			{label}
			{count !== undefined && <span className="font-normal">({count})</span>}
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
			<div className="group flex items-center">
				<button
					type="button"
					onClick={() => onToggle(id)}
					aria-expanded={isOpen}
					className="flex min-w-0 flex-1 items-center gap-1 rounded px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
				>
					<ChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')} aria-hidden="true" />
					<span className="truncate">{label}</span>
				</button>
				{action && <div className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">{action}</div>}
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
			className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
		>
			<Plus className="size-3.5" />
		</button>
	);
}

function FlatRow({ page, isActive, untitled }: Readonly<{ page: IDocumentPage; isActive: boolean; untitled: string }>) {
	return (
		<li>
			<Link
				href={`/docs/${encodeURIComponent(page.id)}`}
				aria-current={isActive ? 'page' : undefined}
				className={cn(
					'flex items-center gap-1.5 rounded-md py-1 pl-7 pr-2 text-sm',
					isActive ? 'bg-primary/10 text-foreground' : 'text-foreground/85 hover:bg-foreground/[0.05]'
				)}
			>
				<span className="flex size-5 shrink-0 items-center justify-center text-base leading-none" aria-hidden="true">
					{page.icon || <FileText className="size-4 text-muted-foreground" />}
				</span>
				<span className="truncate">{pageTitle(page, untitled)}</span>
			</Link>
		</li>
	);
}
