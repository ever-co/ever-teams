'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { FileText } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { canMoveUnder, filterPagesLocally, flattenTree, pageTitle, type DocTree } from '@/core/lib/utils/docs-tree';
import type { IDocumentPage } from '@/core/types/interfaces/common/docs';

interface NameDialogProps {
	open: boolean;
	title: string;
	description?: string;
	initialValue: string;
	submitLabel: string;
	onSubmit: (name: string) => Promise<void> | void;
	onClose: () => void;
}

/** A single name field: rename, or name a copy. */
export function DocsNameDialog({ open, title, description, initialValue, submitLabel, onSubmit, onClose }: NameDialogProps) {
	const t = useTranslations();
	const [value, setValue] = useState(initialValue);
	const [isBusy, setIsBusy] = useState(false);

	useEffect(() => {
		if (open) setValue(initialValue);
	}, [initialValue, open]);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		const name = value.trim();
		if (!name || isBusy) return;
		setIsBusy(true);
		try {
			await onSubmit(name);
			onClose();
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={submit} className="flex flex-col gap-4">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						{description && <DialogDescription>{description}</DialogDescription>}
					</DialogHeader>
					<Input value={value} onChange={(event) => setValue(event.target.value)} autoFocus aria-label={t('docs.PAGE_TITLE')} maxLength={200} />
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							{t('docs.CANCEL')}
						</Button>
						<Button type="submit" disabled={!value.trim() || isBusy}>
							{submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

interface MoveDialogProps {
	open: boolean;
	tree: DocTree;
	page: IDocumentPage | null;
	onMove: (parentId: string | null) => Promise<void> | void;
	onClose: () => void;
}

/** Picks the page's new parent: the top level, or any page that is not itself or one of its sub-pages. */
export function DocsMoveDialog({ open, tree, page, onMove, onClose }: MoveDialogProps) {
	const t = useTranslations();
	const [query, setQuery] = useState('');
	const [isBusy, setIsBusy] = useState(false);

	useEffect(() => {
		if (open) setQuery('');
	}, [open]);

	const candidates = useMemo(() => {
		if (!page) return [];
		const everyId = new Set(tree.byId.keys());
		const rows = flattenTree(tree.roots, everyId).filter((row) => canMoveUnder(tree, page.id, row.page.id) && row.page.id !== page.parentId);
		const allowed = new Set(filterPagesLocally(rows.map((row) => row.page), query).map((candidate) => candidate.id));
		return rows.filter((row) => allowed.has(row.page.id));
	}, [page, query, tree]);

	const move = async (parentId: string | null) => {
		if (isBusy) return;
		setIsBusy(true);
		try {
			await onMove(parentId);
			onClose();
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('docs.MOVE_TO')}</DialogTitle>
					<DialogDescription>{t('docs.MOVE_TO_TEXT', { title: pageTitle(page, t('docs.UNTITLED')) })}</DialogDescription>
				</DialogHeader>
				<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('docs.SEARCH_PAGES')} aria-label={t('docs.SEARCH_PAGES')} autoFocus />
				<ul className="max-h-72 overflow-y-auto rounded-md border border-border p-1" aria-label={t('docs.MOVE_TO')}>
					{page?.parentId && (
						<li>
							<button
								type="button"
								disabled={isBusy}
								onClick={() => move(null)}
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-foreground/[0.05]"
							>
								<span className="text-muted-foreground">↑</span>
								{t('docs.TOP_LEVEL')}
							</button>
						</li>
					)}
					{candidates.map((row) => (
						<li key={row.page.id}>
							<button
								type="button"
								disabled={isBusy}
								onClick={() => move(row.page.id)}
								className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-foreground/[0.05]')}
								style={{ paddingInlineStart: `${8 + row.depth * 12}px` }}
							>
								<span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
									{row.page.icon || <FileText className="size-4 text-muted-foreground" />}
								</span>
								<span className="truncate">{pageTitle(row.page, t('docs.UNTITLED'))}</span>
							</button>
						</li>
					))}
					{candidates.length === 0 && !page?.parentId && <li className="px-2 py-1.5 text-sm text-muted-foreground">{t('docs.NO_MATCHES')}</li>}
				</ul>
				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						{t('docs.CANCEL')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface PickPageDialogProps {
	open: boolean;
	title: string;
	description?: string;
	pages: readonly IDocumentPage[];
	excludeIds?: ReadonlySet<string>;
	onPick: (page: IDocumentPage) => Promise<void> | void;
	onClose: () => void;
}

/** Picks one page of the workspace (to attach it to a project). */
export function DocsPickPageDialog({ open, title, description, pages, excludeIds, onPick, onClose }: PickPageDialogProps) {
	const t = useTranslations();
	const [query, setQuery] = useState('');
	const [isBusy, setIsBusy] = useState(false);

	useEffect(() => {
		if (open) setQuery('');
	}, [open]);

	const candidates = useMemo(
		() => filterPagesLocally(pages.filter((page) => !excludeIds?.has(page.id)), query).slice(0, 50),
		[excludeIds, pages, query]
	);

	const pick = async (page: IDocumentPage) => {
		if (isBusy) return;
		setIsBusy(true);
		try {
			await onPick(page);
			onClose();
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('docs.SEARCH_PAGES')} aria-label={t('docs.SEARCH_PAGES')} autoFocus />
				<ul className="max-h-72 overflow-y-auto rounded-md border border-border p-1" aria-label={title}>
					{candidates.map((page) => (
						<li key={page.id}>
							<button
								type="button"
								disabled={isBusy}
								onClick={() => pick(page)}
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-foreground/[0.05]"
							>
								<span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
									{page.icon || <FileText className="size-4 text-muted-foreground" />}
								</span>
								<span className="truncate">{pageTitle(page, t('docs.UNTITLED'))}</span>
							</button>
						</li>
					))}
					{candidates.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">{t('docs.NO_MATCHES')}</li>}
				</ul>
				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						{t('docs.CANCEL')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
