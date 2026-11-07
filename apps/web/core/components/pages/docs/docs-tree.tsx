'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, FileText, MoreHorizontal, Plus, Star } from '@/core/components/icons';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { cn } from '@/core/lib/helpers';
import { canMoveUnder, flattenTree, nextFocusIndex, pageTitle, type DocTree, type DocTreeNode } from '@/core/lib/utils/docs-tree';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';

export const DOCS_DRAG_TYPE = 'application/x-docs-page';

/** What a row's menu can ask of the page. */
export interface DocsTreeActions {
	newSubPage: (parentId: string) => void;
	rename: (page: IDocumentPage) => void;
	changeIcon: (page: IDocumentPage) => void;
	toggleFavorite: (page: IDocumentPage) => void;
	moveUp: (page: IDocumentPage) => void;
	moveDown: (page: IDocumentPage) => void;
	moveTo: (page: IDocumentPage) => void;
	duplicate: (page: IDocumentPage, deep: boolean) => void;
	setVisibility: (page: IDocumentPage, visibility: EDocumentVisibility) => void;
	trash: (page: IDocumentPage) => void;
	/** Drop of a dragged page onto another (nest) or onto the section (root). */
	drop: (pageId: string, parentId: string | null) => void;
}

interface DocsTreeProps {
	tree: DocTree;
	activeId: string | null;
	expanded: ReadonlySet<string>;
	favoriteIds: ReadonlySet<string>;
	onToggle: (pageId: string) => void;
	onSetOpen: (pageId: string, open: boolean) => void;
	actions: DocsTreeActions;
	/** The accessible name of this tree (its section). */
	label: string;
	emptyText?: string;
}

/**
 * One section's page tree: rows with their depth, a chevron for pages with sub-pages, the active page, hover
 * actions, a menu, keyboard movement (arrows, Home, End, Enter) and drag to nest.
 */
export function DocsTree({ tree, activeId, expanded, favoriteIds, onToggle, onSetOpen, actions, label, emptyText }: DocsTreeProps) {
	const t = useTranslations();
	const rows = useMemo(() => flattenTree(tree.roots, expanded), [expanded, tree.roots]);
	const [focusIndex, setFocusIndex] = useState(-1);
	const [dropTarget, setDropTarget] = useState<string | null>(null);
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		if (focusIndex >= rows.length) setFocusIndex(rows.length - 1);
	}, [focusIndex, rows.length]);

	const focusRow = useCallback((index: number) => {
		const link = listRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-docs-row]')[index];
		link?.focus();
	}, []);

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLUListElement>) => {
			const current = rows.findIndex((row) => row.page.id === (event.target as HTMLElement).closest('a')?.dataset.docsRow);
			const next = nextFocusIndex(rows.length, current, event.key);
			if (next >= 0) {
				event.preventDefault();
				setFocusIndex(next);
				focusRow(next);
				return;
			}
			const row = rows[current];
			if (!row) return;
			if (event.key === 'ArrowRight') {
				if (row.children.length > 0 && !expanded.has(row.page.id)) {
					event.preventDefault();
					onSetOpen(row.page.id, true);
				} else if (row.children.length > 0) {
					event.preventDefault();
					setFocusIndex(current + 1);
					focusRow(current + 1);
				}
			} else if (event.key === 'ArrowLeft') {
				if (row.children.length > 0 && expanded.has(row.page.id)) {
					event.preventDefault();
					onSetOpen(row.page.id, false);
				} else if (row.page.parentId) {
					const parentIndex = rows.findIndex((candidate) => candidate.page.id === row.page.parentId);
					if (parentIndex >= 0) {
						event.preventDefault();
						setFocusIndex(parentIndex);
						focusRow(parentIndex);
					}
				}
			}
		},
		[expanded, focusRow, onSetOpen, rows]
	);

	const canDrop = useCallback(
		(event: DragEvent, targetId: string | null) => {
			if (!event.dataTransfer.types.includes(DOCS_DRAG_TYPE)) return false;
			const draggedId = event.dataTransfer.getData(DOCS_DRAG_TYPE);
			// Chrome hides the data while dragging; the row itself answers then.
			if (!draggedId) return true;
			return canMoveUnder(tree, draggedId, targetId);
		},
		[tree]
	);

	const onDrop = useCallback(
		(event: DragEvent, targetId: string | null) => {
			event.preventDefault();
			setDropTarget(null);
			const draggedId = event.dataTransfer.getData(DOCS_DRAG_TYPE);
			if (!draggedId || draggedId === targetId) return;
			if (!canMoveUnder(tree, draggedId, targetId)) return;
			if ((tree.byId.get(draggedId)?.page.parentId ?? null) === targetId) return;
			actions.drop(draggedId, targetId);
		},
		[actions, tree]
	);

	if (rows.length === 0) {
		return emptyText ? <p className="px-3 py-1.5 text-xs text-muted-foreground">{emptyText}</p> : null;
	}

	return (
		<ul
			ref={listRef}
			role="tree"
			aria-label={label}
			className="flex flex-col gap-px"
			onKeyDown={onKeyDown}
			onDragOver={(event) => {
				if (canDrop(event, null)) event.preventDefault();
			}}
			onDrop={(event) => {
				if ((event.target as HTMLElement).closest('[data-docs-row]')) return;
				onDrop(event, null);
			}}
		>
			{rows.map((row, index) => (
				<DocsTreeRow
					key={row.page.id}
					row={row}
					isActive={row.page.id === activeId}
					isExpanded={expanded.has(row.page.id)}
					isFavorite={favoriteIds.has(row.page.id)}
					isDropTarget={dropTarget === row.page.id}
					tabIndex={index === (focusIndex < 0 ? 0 : focusIndex) ? 0 : -1}
					onFocus={() => setFocusIndex(index)}
					onToggle={() => onToggle(row.page.id)}
					actions={actions}
					onDragOver={(event) => {
						if (!canDrop(event, row.page.id)) return;
						event.preventDefault();
						event.stopPropagation();
						if (dropTarget !== row.page.id) setDropTarget(row.page.id);
					}}
					onDragLeave={() => setDropTarget((current) => (current === row.page.id ? null : current))}
					onDrop={(event) => {
						event.stopPropagation();
						onDrop(event, row.page.id);
					}}
					untitled={t('docs.UNTITLED')}
				/>
			))}
		</ul>
	);
}

interface DocsTreeRowProps {
	row: DocTreeNode;
	isActive: boolean;
	isExpanded: boolean;
	isFavorite: boolean;
	isDropTarget: boolean;
	tabIndex: number;
	onFocus: () => void;
	onToggle: () => void;
	actions: DocsTreeActions;
	onDragOver: (event: DragEvent<HTMLLIElement>) => void;
	onDragLeave: () => void;
	onDrop: (event: DragEvent<HTMLLIElement>) => void;
	untitled: string;
}

function DocsTreeRow({ row, isActive, isExpanded, isFavorite, isDropTarget, tabIndex, onFocus, onToggle, actions, onDragOver, onDragLeave, onDrop, untitled }: DocsTreeRowProps) {
	const t = useTranslations();
	const { page } = row;
	const hasChildren = row.children.length > 0;
	const title = pageTitle(page, untitled);
	const isPrivate = page.visibility === EDocumentVisibility.PRIVATE;

	return (
		<li
			role="treeitem"
			aria-selected={isActive}
			aria-expanded={hasChildren ? isExpanded : undefined}
			aria-level={row.depth + 1}
			className={cn(
				'group relative flex items-center rounded-md pr-1 transition-colors',
				isActive ? 'bg-primary/10 text-foreground' : 'text-foreground/85 hover:bg-foreground/[0.05]',
				isDropTarget && 'ring-2 ring-primary/50'
			)}
			style={{ paddingInlineStart: `${row.depth * 14}px` }}
			draggable
			onDragStart={(event) => {
				event.dataTransfer.setData(DOCS_DRAG_TYPE, page.id);
				event.dataTransfer.effectAllowed = 'move';
			}}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<button
				type="button"
				tabIndex={-1}
				aria-label={isExpanded ? t('docs.COLLAPSE') : t('docs.EXPAND')}
				onClick={(event) => {
					event.preventDefault();
					onToggle();
				}}
				className={cn(
					'flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground',
					!hasChildren && 'invisible'
				)}
			>
				<ChevronRight className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')} />
			</button>
			<Link
				href={`/docs/${encodeURIComponent(page.id)}`}
				data-docs-row={page.id}
				tabIndex={tabIndex}
				onFocus={onFocus}
				aria-current={isActive ? 'page' : undefined}
				className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded"
			>
				<span className="flex size-5 shrink-0 items-center justify-center text-base leading-none" aria-hidden="true">
					{page.icon ? page.icon : <FileText className="size-4 text-muted-foreground" />}
				</span>
				<span className="truncate">{title}</span>
				{isFavorite && <Star className="size-3 shrink-0 fill-current text-amber-500" aria-label={t('docs.FAVORITE')} />}
			</Link>
			<div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
				<button
					type="button"
					aria-label={t('docs.NEW_SUB_PAGE')}
					title={t('docs.NEW_SUB_PAGE')}
					onClick={() => actions.newSubPage(page.id)}
					className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
				>
					<Plus className="size-3.5" />
				</button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t('docs.PAGE_MENU')}
							title={t('docs.PAGE_MENU')}
							className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
						>
							<MoreHorizontal className="size-3.5" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56">
						<DropdownMenuItem onClick={() => actions.newSubPage(page.id)}>{t('docs.NEW_SUB_PAGE')}</DropdownMenuItem>
						<DropdownMenuItem onClick={() => actions.rename(page)}>{t('docs.RENAME')}</DropdownMenuItem>
						<DropdownMenuItem onClick={() => actions.changeIcon(page)}>{t('docs.CHANGE_ICON')}</DropdownMenuItem>
						<DropdownMenuItem onClick={() => actions.toggleFavorite(page)}>
							{isFavorite ? t('docs.UNFAVORITE') : t('docs.FAVORITE')}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => actions.moveUp(page)}>{t('docs.MOVE_UP')}</DropdownMenuItem>
						<DropdownMenuItem onClick={() => actions.moveDown(page)}>{t('docs.MOVE_DOWN')}</DropdownMenuItem>
						<DropdownMenuItem onClick={() => actions.moveTo(page)}>{t('docs.MOVE_TO')}</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => actions.duplicate(page, false)}>{t('docs.DUPLICATE')}</DropdownMenuItem>
						{hasChildren && (
							<DropdownMenuItem onClick={() => actions.duplicate(page, true)}>{t('docs.DUPLICATE_WITH_SUB_PAGES')}</DropdownMenuItem>
						)}
						<DropdownMenuItem
							onClick={() => actions.setVisibility(page, isPrivate ? EDocumentVisibility.ORGANIZATION : EDocumentVisibility.PRIVATE)}
						>
							{isPrivate ? t('docs.MAKE_WORKSPACE') : t('docs.MAKE_PRIVATE')}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => actions.trash(page)}>
							{t('docs.MOVE_TO_TRASH')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</li>
	);
}
