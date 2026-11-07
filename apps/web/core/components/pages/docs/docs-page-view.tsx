'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { RichTextView } from '@/core/components/common/rich-editor/rich-text-view';
import { ArrowLeft, FileText, History, Lock, MoreHorizontal, Star, Trash } from '@/core/components/icons';
import { useDocsAutosave, type DocsSaveState } from '@/core/hooks/docs/use-docs-autosave';
import { useDocsPage, useDocsPath } from '@/core/hooks/docs/use-docs-page';
import { useDocsRecent } from '@/core/hooks/docs/use-docs-recent';
import { useDocsMentionCandidates } from '@/core/hooks/docs/use-docs-scope';
import type { DocsTreeState } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { documentToMarkdown, markdownFileName } from '@/core/lib/utils/docs-markdown';
import { pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import type { DocsEditorApi } from './docs-editor-surface';
import { DocsVersionPanel } from './docs-version-panel';

const DocsEditorSurface = dynamic(() => import('./docs-editor-surface').then((module) => module.DocsEditorSurface), {
	ssr: false,
	loading: () => (
		<output aria-busy="true" className="flex min-h-[40vh] flex-col gap-3 py-2">
			<div className="h-4 w-2/3 animate-pulse rounded-md bg-foreground/[0.06]" />
			<div className="h-4 w-1/2 animate-pulse rounded-md bg-foreground/[0.06]" />
			<div className="h-4 w-3/5 animate-pulse rounded-md bg-foreground/[0.06]" />
		</output>
	)
});

/** The title saves this long after the last keystroke. */
const TITLE_SAVE_DELAY_MS = 600;

export interface DocsPageViewActions {
	rename: (pageId: string, name: string) => Promise<unknown>;
	setIcon: (page: IDocumentPage) => void;
	setVisibility: (page: IDocumentPage, visibility: EDocumentVisibility) => Promise<unknown>;
	moveTo: (page: IDocumentPage) => void;
	duplicate: (page: IDocumentPage, deep: boolean) => Promise<unknown>;
	trash: (page: IDocumentPage) => Promise<unknown>;
	restore: (page: IDocumentPage) => Promise<unknown>;
	restoreVersion: (pageId: string, versionId: string) => Promise<unknown>;
	toggleFavorite: (pageId: string) => Promise<unknown>;
	isFavorite: (pageId: string) => boolean;
}

interface DocsPageViewProps {
	pageId: string;
	tree: DocsTreeState;
	actions: DocsPageViewActions;
}

/** One page: its path, title, icon, the editor with autosave, the menu and the version history. */
export function DocsPageView({ pageId, tree, actions }: DocsPageViewProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { page, isLoading, isError, isNotFound, retry } = useDocsPage(pageId, true);
	const { path } = useDocsPath(pageId, !!page);
	const autosave = useDocsAutosave(page);
	const mentions = useDocsMentionCandidates();
	const { remember } = useDocsRecent();
	const [showHistory, setShowHistory] = useState(false);
	const [editorApi, setEditorApi] = useState<DocsEditorApi | null>(null);
	const hasChildren = (tree.tree.byId.get(pageId)?.children.length ?? 0) > 0;

	useEffect(() => {
		if (page && !page.isArchived) remember(page.id);
	}, [page, remember]);

	useEffect(() => {
		setShowHistory(false);
		setEditorApi(null);
	}, [pageId]);

	// ---------------------------------------------------------------- title

	const [title, setTitle] = useState('');
	const titleDirtyRef = useRef(false);
	const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!titleDirtyRef.current) setTitle(page?.name ?? '');
	}, [page?.name]);

	const saveTitle = useCallback(
		async (value: string) => {
			const name = value.trim();
			if (!page || name === (page.name ?? '').trim()) {
				titleDirtyRef.current = false;
				return;
			}
			try {
				await actions.rename(page.id, name || t('docs.UNTITLED'));
			} catch {
				toast.error(t('docs.SAVE_TITLE_ERROR'));
			} finally {
				titleDirtyRef.current = false;
			}
		},
		[actions, page, t]
	);

	const onTitleChange = (value: string) => {
		setTitle(value);
		titleDirtyRef.current = true;
		if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
		titleTimerRef.current = setTimeout(() => void saveTitle(value), TITLE_SAVE_DELAY_MS);
	};

	const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
			void saveTitle(title);
			editorApi?.focus('start');
		}
	};

	useEffect(
		() => () => {
			if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
		},
		[]
	);

	// ---------------------------------------------------------------- export

	const exportMarkdown = () => {
		if (!page) return;
		const json = editorApi?.getJson() ?? page.contentJson ?? null;
		const heading = pageTitle({ name: title }, t('docs.UNTITLED'));
		const markdown = `# ${heading}\n\n${documentToMarkdown(json)}`;
		const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = markdownFileName(heading);
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const updatedAtLabel = useMemo(() => {
		if (!page?.updatedAt) return '';
		return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(page.updatedAt));
	}, [locale, page?.updatedAt]);

	// ---------------------------------------------------------------- states

	if (isNotFound) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<AnimatedEmptyState
					title={t('docs.NOT_FOUND_TITLE')}
					message={
						<span>
							{t('docs.NOT_FOUND_TEXT')}{' '}
							<Link href="/docs" className="text-primary underline-offset-2 hover:underline">
								{t('docs.BACK_TO_DOCS')}
							</Link>
						</span>
					}
					showBorder={false}
				/>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm">
				<p className="text-muted-foreground">{t('docs.LOAD_ERROR')}</p>
				<Button type="button" variant="outline" size="sm" onClick={() => retry()}>
					{t('docs.RETRY')}
				</Button>
			</div>
		);
	}

	if (isLoading || !page) {
		return (
			<div aria-busy="true" className="flex flex-col gap-4 px-6 py-6 lg:px-12">
				<div className="h-4 w-40 animate-pulse rounded-md bg-foreground/[0.05]" />
				<div className="h-9 w-2/3 animate-pulse rounded-md bg-foreground/[0.07]" />
				<div className="h-4 w-1/2 animate-pulse rounded-md bg-foreground/[0.05]" />
			</div>
		);
	}

	const isPrivate = page.visibility === EDocumentVisibility.PRIVATE;
	const isReadOnly = Boolean(page.isLocked || page.isArchived);
	const crumbs = [
		{ title: t('docs.TITLE'), href: '/docs' },
		...path
			.filter((segment) => segment.id && segment.id !== page.id)
			.map((segment) => ({
				title: segment.restricted ? '…' : pageTitle({ name: segment.name ?? '' }, t('docs.UNTITLED')),
				href: `/docs/${encodeURIComponent(String(segment.id))}`
			})),
		pageTitle({ name: title }, t('docs.UNTITLED'))
	];

	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3 print:hidden">
					<Link href="/docs" className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground lg:hidden" aria-label={t('docs.BACK')}>
						<ArrowLeft className="size-4" />
					</Link>
					<div className="min-w-0 flex-1 overflow-hidden">
						<Breadcrumb paths={crumbs} className="text-xs" />
					</div>
					<SaveStateLabel state={autosave.state} />
					<button
						type="button"
						onClick={() => void actions.toggleFavorite(page.id)}
						aria-pressed={actions.isFavorite(page.id)}
						aria-label={actions.isFavorite(page.id) ? t('docs.UNFAVORITE') : t('docs.FAVORITE')}
						title={actions.isFavorite(page.id) ? t('docs.UNFAVORITE') : t('docs.FAVORITE')}
						className="rounded p-1.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
					>
						<Star className={cn('size-4', actions.isFavorite(page.id) && 'fill-current text-amber-500')} />
					</button>
					<button
						type="button"
						onClick={() => setShowHistory((current) => !current)}
						aria-pressed={showHistory}
						aria-label={t('docs.VERSION_HISTORY')}
						title={t('docs.VERSION_HISTORY')}
						className={cn('rounded p-1.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground', showHistory && 'bg-foreground/[0.08] text-foreground')}
					>
						<History className="size-4" />
					</button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button type="button" aria-label={t('docs.PAGE_MENU')} title={t('docs.PAGE_MENU')} className="rounded p-1.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
								<MoreHorizontal className="size-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-60">
							<DropdownMenuItem onClick={() => actions.setIcon(page)}>{t('docs.CHANGE_ICON')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => actions.moveTo(page)}>{t('docs.MOVE_TO')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => void actions.duplicate(page, false)}>{t('docs.DUPLICATE')}</DropdownMenuItem>
							{hasChildren && <DropdownMenuItem onClick={() => void actions.duplicate(page, true)}>{t('docs.DUPLICATE_WITH_SUB_PAGES')}</DropdownMenuItem>}
							<DropdownMenuItem onClick={() => void actions.setVisibility(page, isPrivate ? EDocumentVisibility.ORGANIZATION : EDocumentVisibility.PRIVATE)}>
								{isPrivate ? t('docs.MAKE_WORKSPACE') : t('docs.MAKE_PRIVATE')}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={exportMarkdown}>{t('docs.EXPORT_MARKDOWN')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => window.print()}>{t('docs.PRINT')}</DropdownMenuItem>
							<DropdownMenuSeparator />
							{page.isArchived ? (
								<DropdownMenuItem onClick={() => void actions.restore(page)}>{t('docs.RESTORE')}</DropdownMenuItem>
							) : (
								<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void actions.trash(page)}>
									{t('docs.MOVE_TO_TRASH')}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="mx-auto w-full max-w-3xl px-6 py-6 lg:px-10">
						{page.isArchived && (
							<Notice tone="warning" icon={<Trash className="size-4" />}>
								<span>{t('docs.IN_TRASH_NOTICE')}</span>
								<Button type="button" size="sm" variant="outline" onClick={() => void actions.restore(page)}>
									{t('docs.RESTORE')}
								</Button>
							</Notice>
						)}
						{page.isLocked && !page.isArchived && (
							<Notice tone="muted" icon={<Lock className="size-4" />}>
								<span>{t('docs.LOCKED_NOTICE')}</span>
							</Notice>
						)}
						{autosave.state === 'conflict' && (
							<Notice tone="warning">
								<div className="flex flex-col gap-1">
									<strong>{t('docs.CONFLICT_TITLE')}</strong>
									<span>{t('docs.CONFLICT_TEXT')}</span>
								</div>
								<div className="flex shrink-0 gap-2">
									<Button type="button" size="sm" variant="outline" onClick={() => void autosave.reload()}>
										{t('docs.RELOAD')}
									</Button>
									<Button type="button" size="sm" onClick={() => void autosave.keepMine()}>
										{t('docs.KEEP_MINE')}
									</Button>
								</div>
							</Notice>
						)}
						{autosave.state === 'locked' && (
							<Notice tone="warning" icon={<Lock className="size-4" />}>
								<span>{t('docs.LOCKED_WHILE_EDITING')}</span>
								<Button type="button" size="sm" variant="outline" onClick={() => void autosave.reload()}>
									{t('docs.RELOAD')}
								</Button>
							</Notice>
						)}
						{autosave.state === 'too-large' && (
							<Notice tone="warning">
								<span>{t('docs.TOO_LARGE')}</span>
							</Notice>
						)}
						{autosave.state === 'error' && (
							<Notice tone="warning">
								<span>{t('docs.SAVE_ERROR')}</span>
								<Button type="button" size="sm" variant="outline" onClick={() => void autosave.flushNow()}>
									{t('docs.RETRY')}
								</Button>
							</Notice>
						)}

						<div className="mb-4 flex items-start gap-2">
							<button
								type="button"
								onClick={() => actions.setIcon(page)}
								aria-label={t('docs.CHANGE_ICON')}
								title={t('docs.CHANGE_ICON')}
								disabled={isReadOnly}
								className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-md text-3xl leading-none hover:bg-foreground/[0.06] disabled:hover:bg-transparent print:hidden"
							>
								{page.icon ? page.icon : <FileText className="size-6 text-muted-foreground" />}
							</button>
							<input
								value={title}
								onChange={(event) => onTitleChange(event.target.value)}
								onKeyDown={onTitleKeyDown}
								onBlur={() => {
									if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
									if (titleDirtyRef.current) void saveTitle(title);
								}}
								placeholder={t('docs.UNTITLED')}
								aria-label={t('docs.PAGE_TITLE')}
								readOnly={isReadOnly}
								maxLength={200}
								className="min-w-0 flex-1 bg-transparent text-3xl font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/60"
							/>
						</div>
						<p className="mb-4 text-xs text-muted-foreground print:hidden">
							{t('docs.UPDATED_AT', { date: updatedAtLabel })}
							{isPrivate && <span> · {t('docs.PRIVATE_PAGE')}</span>}
						</p>

						{isReadOnly ? (
							<RichTextView value={page.contentHtml ?? ''} emptyState={<p className="text-sm text-muted-foreground">{t('docs.EMPTY_PAGE')}</p>} />
						) : (
							<DocsEditorSurface
								key={page.id}
								value={page.contentHtml ?? ''}
								onChange={autosave.change}
								onReady={setEditorApi}
								onSaveShortcut={() => void autosave.flushNow()}
								mentions={mentions}
								placeholder={t('docs.EDITOR_PLACEHOLDER')}
								title={pageTitle({ name: title }, t('docs.UNTITLED'))}
							/>
						)}
					</div>
				</div>
			</div>
			{showHistory && (
				<div className="absolute inset-0 z-10 bg-background lg:static lg:z-auto lg:w-80 lg:shrink-0 print:hidden">
					<DocsVersionPanel
						pageId={page.id}
						onClose={() => setShowHistory(false)}
						onRestore={async (versionId) => {
							await actions.restoreVersion(page.id, versionId);
							toast.success(t('docs.VERSION_RESTORED'));
						}}
					/>
				</div>
			)}
		</div>
	);
}

function SaveStateLabel({ state }: Readonly<{ state: DocsSaveState }>) {
	const t = useTranslations();
	const label =
		state === 'saving' ? t('docs.SAVING') : state === 'saved' ? t('docs.SAVED') : state === 'dirty' ? t('docs.UNSAVED') : state === 'error' ? t('docs.NOT_SAVED') : '';
	if (!label) return null;
	return (
		<span role="status" aria-live="polite" className={cn('shrink-0 text-xs', state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
			{label}
		</span>
	);
}

function Notice({ tone, icon, children }: Readonly<{ tone: 'warning' | 'muted'; icon?: ReactNode; children: ReactNode }>) {
	return (
		<div
			role={tone === 'warning' ? 'alert' : 'note'}
			className={cn(
				'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm',
				tone === 'warning' ? 'border-amber-500/40 bg-amber-500/10 text-foreground' : 'border-border bg-foreground/[0.03] text-muted-foreground'
			)}
		>
			<div className="flex min-w-0 flex-1 items-center gap-2">
				{icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
				<div className="min-w-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
