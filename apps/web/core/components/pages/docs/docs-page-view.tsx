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
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { RichTextView } from '@/core/components/common/rich-editor/rich-text-view';
import { ADD_ROW_RECIPE } from '@/core/components/common/surface-recipes';
import { ArrowLeft, Check, CircleAlert, FileText, History, Lock, MoreHorizontal, Plus, Smile, Spinner, Star, Trash } from '@/core/components/icons';
import { useDocsAutosave, useEditorPageContent, type DocsSaveState } from '@/core/hooks/docs/use-docs-autosave';
import { useDocsFollow, type DocsFollowAction, type DocsSpacesState } from '@/core/hooks/docs/use-docs-collaboration';
import { useDocsLive } from '@/core/hooks/docs/use-docs-live';
import { useDocsPage, useDocsPath } from '@/core/hooks/docs/use-docs-page';
import { useDocsRecent } from '@/core/hooks/docs/use-docs-recent';
import { useDocsMentionCandidates } from '@/core/hooks/docs/use-docs-scope';
import type { DocsTreeState } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { DOCS_LIVE_FIELD } from '@/core/lib/docs-live/config';
import { documentToMarkdown, markdownFileName, mentionedEmployeeIds } from '@/core/lib/utils/docs-markdown';
import { DOCS_OUTLINE_SELECTOR, outlineOf, textStatsOf, type DocsOutlineItem } from '@/core/lib/utils/docs-outline';
import { pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentKind, EDocumentVisibility, type IDocumentNode, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import type { DocsEditorApi, DocsEditorLive } from './docs-editor-surface';
import { DocsLiveStatusLabel, useLiveReadOnlyText } from './docs-live-presence';
import { DocsPageGlyph } from './docs-page-glyph';
import { DocsVersionPanel } from './docs-version-panel';

const DocsEditorSurface = dynamic(() => import('./docs-editor-surface').then((module) => module.DocsEditorSurface), {
	ssr: false,
	loading: () => <BodySkeleton />
});

/** The title saves this long after the last keystroke. */
const TITLE_SAVE_DELAY_MS = 600;
/** The outline and the word count follow the text this long after the last keystroke. */
const OUTLINE_DELAY_MS = 400;
/** Where this device keeps "full width" for the pages. */
const FULL_WIDTH_KEY = 'docs-full-width';

const BAR_BUTTON =
	'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

export interface DocsPageViewActions {
	rename: (pageId: string, name: string) => Promise<unknown>;
	setIcon: (page: IDocumentPage) => void;
	setVisibility: (page: IDocumentPage, visibility: EDocumentVisibility) => Promise<unknown>;
	/** Into another space (on a platform with Docs collaboration). */
	moveToSpace: (page: IDocumentPage, visibility: EDocumentVisibility, organizationTeamId: string | null) => Promise<unknown>;
	moveTo: (page: IDocumentPage) => void;
	duplicate: (page: IDocumentPage, deep: boolean) => Promise<unknown>;
	trash: (page: IDocumentPage) => Promise<unknown>;
	restore: (page: IDocumentPage) => Promise<unknown>;
	restoreVersion: (pageId: string, versionId: string) => Promise<unknown>;
	toggleFavorite: (pageId: string) => Promise<unknown>;
	isFavorite: (pageId: string) => boolean;
	newSubPage: (page: IDocumentPage) => void;
}

interface DocsPageViewProps {
	pageId: string;
	tree: DocsTreeState;
	actions: DocsPageViewActions;
	/** The spaces of the tree; without Docs collaboration on the platform, only the workspace and private. */
	spaces?: DocsSpacesState;
}

const NO_SPACES: DocsSpacesState = { available: false, teamSpaces: [] };

/** A version older than any page: a draft written against it always meets the platform's text as a conflict. */
const NEVER_SAVED_CLOCK = '1970-01-01T00:00:00.000Z';

function readFullWidth(): boolean {
	try {
		return window.localStorage.getItem(FULL_WIDTH_KEY) === '1';
	} catch {
		return false;
	}
}

/** One page: its path, icon, title, the editor with autosave, its outline, its sub-pages, the menu and the version history. */
export function DocsPageView({ pageId, tree, actions, spaces = NO_SPACES }: DocsPageViewProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { page, isLoading, isError, isNotFound, retry } = useDocsPage(pageId, true);
	const { path } = useDocsPath(pageId, !!page);
	const autosave = useDocsAutosave(page);
	// The page holds content this editor cannot carry: shown read-only, never saved from here.
	const [unsupported, setUnsupported] = useState(false);
	// A page (not a folder) outside the trash, unlocked and carried by this editor is edited live when the deployment and
	// the platform both do; otherwise (and once live editing stops) the autosave edits it. One live session per view:
	// - it starts only while the autosave holds nothing of this page (a draft kept from an earlier visit, a save on its
	//   way): that text is settled in the autosave first, never hidden behind a live editor;
	// - once the page stops qualifying (locked, trashed, content this editor cannot carry) it never starts again here,
	//   so the autosave editor is never swapped for a live one under the person's hands. The next visit goes live.
	const qualifiesForLive = Boolean(page && page.kind === EDocumentKind.PAGE && !page.isArchived && !page.isLocked && !unsupported);
	const autosaveHolds = autosave.restoredHtml !== null || autosave.hasDraft() || (autosave.state !== 'idle' && autosave.state !== 'saved');
	const [liveStarted, setLiveStarted] = useState(false);
	const [liveRevoked, setLiveRevoked] = useState(false);
	if (!liveStarted && !liveRevoked && qualifiesForLive && !autosaveHolds) setLiveStarted(true);
	if (!liveRevoked && page && (autosaveHolds ? !liveStarted : !qualifiesForLive && liveStarted)) setLiveRevoked(true);
	const live = useDocsLive(page?.id ?? null, liveStarted && !liveRevoked && qualifiesForLive);
	// Follows exist where spaces do: both are the platform's Docs collaboration.
	const follow = useDocsFollow(page?.id ?? null, Boolean(page && !page.isArchived && spaces.available));
	// A refreshed page (a live event, another person's save) reaches the editor only while nothing typed here is unsaved:
	// neither its text nor its JSON (an unsupported one would turn the page read-only and drop the draft).
	const editorContent = useEditorPageContent(page?.id ?? null, page?.contentHtml ?? '', page?.contentJson ?? null, autosave.hasDraft());
	const mentions = useDocsMentionCandidates();
	const { remember } = useDocsRecent();
	// Both start over with the page: the parent renders this view with `key={pageId}`.
	const [showHistory, setShowHistory] = useState(false);
	const [editorApi, setEditorApi] = useState<DocsEditorApi | null>(null);
	// Read once, on this device: the page's text is not rendered before its data, so the server never shows a width.
	const [fullWidth, setFullWidth] = useState(readFullWidth);
	const { discard, change } = autosave;
	const onUnsupported = useCallback(() => {
		discard();
		setUnsupported(true);
	}, [discard]);
	const children = tree.tree.byId.get(pageId)?.children ?? [];
	const hasChildren = children.length > 0;

	useEffect(() => {
		if (page && !page.isArchived) remember(page.id);
	}, [page, remember]);

	const toggleFullWidth = (next: boolean) => {
		setFullWidth(next);
		try {
			window.localStorage.setItem(FULL_WIDTH_KEY, next ? '1' : '0');
		} catch {
			// Storage can be blocked; the choice then lasts as long as the page is open.
		}
	};

	// ---------------------------------------------------------------- outline and counts

	// What is typed here, a moment after the last keystroke; before the first change, the stored document.
	const [liveJson, setLiveJson] = useState<IDocumentNode | null>(null);
	const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const bodyRef = useRef<HTMLDivElement | null>(null);
	const documentJson = liveJson ?? editorContent.json ?? null;
	const outline = useMemo(() => outlineOf(documentJson), [documentJson]);
	const stats = useMemo(() => textStatsOf(documentJson), [documentJson]);

	const onEditorChange = useCallback(
		(html: string, json: IDocumentNode | null, mentionEmployeeIds: string[]) => {
			change(html, json, mentionEmployeeIds);
			if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
			liveTimerRef.current = setTimeout(() => setLiveJson(json), OUTLINE_DELAY_MS);
		},
		[change]
	);

	// Live, the platform saves the page: a change only moves the outline and the counts.
	const onLiveEditorChange = useCallback((_html: string, json: IDocumentNode | null) => {
		if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
		liveTimerRef.current = setTimeout(() => setLiveJson(json), OUTLINE_DELAY_MS);
	}, []);

	useEffect(
		() => () => {
			if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
		},
		[]
	);

	// The session's document, once its first state arrived: what the live editor binds.
	const liveSnapshot = live.snapshot;
	const isLiveEditing = (live.mode === 'live' || live.mode === 'reconnecting') && Boolean(liveSnapshot?.synced);
	const isLiveConnecting = live.mode === 'connecting' || live.rereading || ((live.mode === 'live' || live.mode === 'reconnecting') && !liveSnapshot?.synced);
	const liveEditor = useMemo<DocsEditorLive | null>(
		() =>
			isLiveEditing && live.binding && liveSnapshot
				? { binding: live.binding, doc: liveSnapshot.doc, awareness: liveSnapshot.awareness, generation: liveSnapshot.generation, readOnly: liveSnapshot.readOnly }
				: null,
		[isLiveEditing, live.binding, liveSnapshot]
	);
	const liveReadOnlyText = useLiveReadOnlyText(liveSnapshot?.readOnly ? liveSnapshot.readOnlyReason : null);

	// The page's version when live editing began, never moved after: unsent text kept after live editing stops is written
	// against it. A later clock (a refresh while the session was down) may stand for text this editor never received, and
	// a save against it would overwrite that text; against this one, any change since meets the save as a conflict.
	const liveClockRef = useRef<string | null>(null);
	const { adoptDraft } = autosave;
	const adoptedRef = useRef(false);
	const pageClock = page?.updatedAt ?? null;
	const pageWritable = Boolean(page && !page.isArchived && !page.isLocked);
	const unsentAtFallback = live.mode === 'fallback' && !live.rereading && Boolean(liveSnapshot?.unsentEdits);
	const fallenDoc = unsentAtFallback ? (liveSnapshot?.doc ?? null) : null;
	useEffect(() => {
		if (isLiveEditing && liveClockRef.current === null) liveClockRef.current = pageClock;
	}, [isLiveEditing, pageClock]);
	// Live editing stopped with edits the platform never confirmed: what the session's document holds becomes the
	// autosave's draft (read from the document, which also covers edits remembered from an earlier visit that no editor
	// showed yet). Without the version live editing began on, the oldest one stands in, so the save meets a conflict.
	useEffect(() => {
		if (!fallenDoc || !pageWritable || adoptedRef.current) return;
		adoptedRef.current = true;
		let current = true;
		void import('@/core/components/common/rich-editor/live-collaboration').then(({ liveDocumentContent }) => {
			if (!current) return;
			const { json, html } = liveDocumentContent(fallenDoc, DOCS_LIVE_FIELD);
			const content = json as IDocumentNode;
			adoptDraft(html, content, mentionedEmployeeIds(content), liveClockRef.current ?? NEVER_SAVED_CLOCK);
		});
		return () => {
			current = false;
		};
	}, [adoptDraft, fallenDoc, pageWritable]);

	const runFollow = (action: DocsFollowAction) => {
		follow.run(action).catch(() => toast.error(t('docs.UPDATE_ERROR')));
	};

	// What the editor holds is the document the outline and the counts read: once it is up (a page stored without
	// the editor's document, written elsewhere as HTML), and again whenever the text it shows is replaced from outside
	// (a reload after a conflict, a restored version, another person's save). What was typed before no longer counts
	// then, nor does an update still waiting from it.
	// The same value the editor is given below: a kept draft (`restoredHtml`) shows instead of the stored page, and its
	// removal by Reload changes the text on screen without changing `editorContent.html`.
	const shownHtml = autosave.restoredHtml ?? editorContent.html;
	useEffect(() => {
		if (!editorApi) return;
		if (liveTimerRef.current) {
			clearTimeout(liveTimerRef.current);
			liveTimerRef.current = null;
		}
		let frames = 0;
		let handle = 0;
		const read = () => {
			const json = editorApi.getJson();
			// The first frame can still hold the text being replaced: the editor is read from the next one on.
			if (json && frames >= 1) {
				setLiveJson(json);
				return;
			}
			if (frames++ < 120) handle = requestAnimationFrame(read);
		};
		handle = requestAnimationFrame(read);
		return () => cancelAnimationFrame(handle);
	}, [editorApi, shownHtml]);

	const jumpToHeading = useCallback((item: DocsOutlineItem) => {
		const heading = bodyRef.current?.querySelectorAll<HTMLElement>(DOCS_OUTLINE_SELECTOR)[item.index];
		heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, []);

	// ---------------------------------------------------------------- title

	const [title, setTitle] = useState('');
	const titleDirtyRef = useRef(false);
	const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const titleRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (!titleDirtyRef.current) setTitle(page?.name ?? '');
	}, [page?.name]);

	// The title wraps: its field is as tall as its text.
	useEffect(() => {
		const element = titleRef.current;
		if (!element) return;
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	}, [title, fullWidth, page?.id]);

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
		// A title is one line: a pasted line break becomes a space.
		const next = value.replace(/\s*[\r\n]+\s*/g, ' ');
		setTitle(next);
		titleDirtyRef.current = true;
		if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
		titleTimerRef.current = setTimeout(() => void saveTitle(next), TITLE_SAVE_DELAY_MS);
	};

	const onTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
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

	// ---------------------------------------------------------------- export and link

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

	const copyLink = () => {
		const url = `${window.location.origin}${window.location.pathname}`;
		navigator.clipboard
			?.writeText(url)
			.then(() => toast(t('docs.LINK_COPIED')))
			.catch(() => undefined);
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
					icon={<FileText />}
					showBorder={false}
					noBg
				/>
			</div>
		);
	}

	if (isError) {
		return (
			<div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm">
				<span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive" aria-hidden="true">
					<CircleAlert className="size-5" />
				</span>
				<p className="text-muted-foreground">{t('docs.LOAD_ERROR')}</p>
				<Button type="button" variant="outline" size="sm" onClick={() => retry()}>
					{t('docs.RETRY')}
				</Button>
			</div>
		);
	}

	if (isLoading || !page) {
		return (
			<div aria-busy="true" className="flex h-full flex-col">
				<div className="flex h-11 shrink-0 items-center px-4 hairline-b border-border">
					<div className="h-3 w-40 animate-pulse rounded-full bg-foreground/[0.06]" />
				</div>
				<div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
					<div className="mb-5 size-12 animate-pulse rounded-xl bg-foreground/[0.06]" />
					<div className="mb-4 h-9 w-2/3 animate-pulse rounded-lg bg-foreground/[0.07]" />
					<div className="mb-8 h-3 w-48 animate-pulse rounded-full bg-foreground/[0.05]" />
					<BodySkeleton />
				</div>
			</div>
		);
	}

	const isPrivate = page.visibility === EDocumentVisibility.PRIVATE;
	const isFolder = page.kind === EDocumentKind.FOLDER;
	const isReadOnly = Boolean(page.isLocked || page.isArchived || unsupported);
	const isFavorite = actions.isFavorite(page.id);
	const shownTitle = pageTitle({ name: title }, t('docs.UNTITLED'));
	const crumbs = [
		{ title: t('docs.TITLE'), href: '/docs?tree=1' },
		...path
			.filter((segment) => segment.id && segment.id !== page.id)
			.map((segment) => ({
				title: segment.restricted ? '…' : pageTitle({ name: segment.name ?? '' }, t('docs.UNTITLED')),
				href: `/docs/${encodeURIComponent(String(segment.id))}`
			})),
		shownTitle
	];
	const showsOutline = !isFolder && outline.length > 1;

	return (
		<div className="flex h-full min-h-0">
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex h-11 shrink-0 items-center gap-1 px-3 hairline-b border-border print:hidden">
					<Link href="/docs?tree=1" className={cn(BAR_BUTTON, 'lg:hidden')} aria-label={t('docs.BACK')}>
						<ArrowLeft className="rtl:rotate-180" />
					</Link>
					<div className="min-w-0 flex-1 overflow-hidden px-1">
						<Breadcrumb paths={crumbs} />
					</div>
					{live.mode !== 'off' && <DocsLiveStatusLabel mode={live.mode} synced={Boolean(liveSnapshot?.synced)} peers={liveSnapshot?.peers ?? []} fallbackReason={liveSnapshot?.fallbackReason ?? null} />}
					{!isLiveEditing && <SaveStateLabel state={autosave.state} />}
					<button
						type="button"
						onClick={() => void actions.toggleFavorite(page.id)}
						aria-pressed={isFavorite}
						aria-label={isFavorite ? t('docs.UNFAVORITE') : t('docs.FAVORITE')}
						title={isFavorite ? t('docs.UNFAVORITE') : t('docs.FAVORITE')}
						className={BAR_BUTTON}
					>
						<Star className={cn(isFavorite && 'fill-current text-amber-500')} />
					</button>
					{!isFolder && (
						<button
							type="button"
							onClick={() => setShowHistory((current) => !current)}
							aria-pressed={showHistory}
							aria-label={t('docs.VERSION_HISTORY')}
							title={t('docs.VERSION_HISTORY')}
							className={cn(BAR_BUTTON, showHistory && 'bg-foreground/[0.08] text-foreground')}
						>
							<History />
						</button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button type="button" aria-label={t('docs.PAGE_MENU')} title={t('docs.PAGE_MENU')} className={BAR_BUTTON}>
								<MoreHorizontal />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-60">
							<DropdownMenuItem onClick={copyLink}>{t('docs.COPY_LINK')}</DropdownMenuItem>
							<DropdownMenuCheckboxItem checked={fullWidth} onCheckedChange={(checked) => toggleFullWidth(checked === true)}>
								{t('docs.FULL_WIDTH')}
							</DropdownMenuCheckboxItem>
							{follow.available && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem disabled={follow.isPending} onClick={() => runFollow(follow.following ? 'unfollow' : 'follow')}>
										{follow.following ? t('docs.UNFOLLOW') : t('docs.FOLLOW')}
									</DropdownMenuItem>
									<DropdownMenuItem disabled={follow.isPending} onClick={() => runFollow(follow.muted ? 'unmute' : 'mute')}>
										{follow.muted ? t('docs.UNMUTE') : t('docs.MUTE')}
									</DropdownMenuItem>
								</>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => actions.setIcon(page)}>{t('docs.CHANGE_ICON')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => actions.moveTo(page)}>{t('docs.MOVE_TO')}</DropdownMenuItem>
							<DropdownMenuItem onClick={() => void actions.duplicate(page, false)}>{t('docs.DUPLICATE')}</DropdownMenuItem>
							{hasChildren && <DropdownMenuItem onClick={() => void actions.duplicate(page, true)}>{t('docs.DUPLICATE_WITH_SUB_PAGES')}</DropdownMenuItem>}
							{spaces.available ? (
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>{t('docs.MOVE_TO_SPACE')}</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="max-h-80 w-56">
										<DropdownMenuCheckboxItem
											checked={page.visibility === EDocumentVisibility.ORGANIZATION}
											onCheckedChange={() => page.visibility !== EDocumentVisibility.ORGANIZATION && void actions.moveToSpace(page, EDocumentVisibility.ORGANIZATION, null)}
										>
											{t('docs.WORKSPACE')}
										</DropdownMenuCheckboxItem>
										{spaces.teamSpaces.map((space) => {
											const teamId = String(space.organizationTeamId);
											const isHere = page.visibility === EDocumentVisibility.TEAM && page.organizationTeamId === teamId;
											return (
												<DropdownMenuCheckboxItem
													key={teamId}
													checked={isHere}
													onCheckedChange={() => !isHere && void actions.moveToSpace(page, EDocumentVisibility.TEAM, teamId)}
												>
													{space.name || t('docs.TEAM_SPACE')}
												</DropdownMenuCheckboxItem>
											);
										})}
										<DropdownMenuCheckboxItem
											checked={isPrivate}
											onCheckedChange={() => !isPrivate && void actions.moveToSpace(page, EDocumentVisibility.PRIVATE, null)}
										>
											{t('docs.PRIVATE')}
										</DropdownMenuCheckboxItem>
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							) : (
								<DropdownMenuItem onClick={() => void actions.setVisibility(page, isPrivate ? EDocumentVisibility.ORGANIZATION : EDocumentVisibility.PRIVATE)}>
									{isPrivate ? t('docs.MAKE_WORKSPACE') : t('docs.MAKE_PRIVATE')}
								</DropdownMenuItem>
							)}
							{!isFolder && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={exportMarkdown}>{t('docs.EXPORT_MARKDOWN')}</DropdownMenuItem>
									<DropdownMenuItem onClick={() => window.print()}>{t('docs.PRINT')}</DropdownMenuItem>
								</>
							)}
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

				<div className="min-h-0 flex-1 overflow-y-auto scroll-pt-6">
					<div className={cn('mx-auto flex w-full gap-10 px-6 pb-24 pt-8 lg:px-12 lg:pt-12', fullWidth ? 'max-w-none' : 'max-w-[68rem]')}>
						<article className={cn('min-w-0 flex-1', !fullWidth && 'mx-auto max-w-3xl')}>
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
							{isLiveEditing && liveReadOnlyText && (
								<Notice tone="muted" icon={<Lock className="size-4" />}>
									<span>{liveReadOnlyText}</span>
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

							<header className="group/header mb-6">
								{page.icon ? (
									<button
										type="button"
										onClick={() => actions.setIcon(page)}
										aria-label={t('docs.CHANGE_ICON')}
										title={t('docs.CHANGE_ICON')}
										disabled={isReadOnly}
										className="-ml-1.5 mb-2 flex size-16 cursor-pointer items-center justify-center rounded-xl text-5xl leading-none outline-none transition-colors hover:bg-foreground/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default disabled:hover:bg-transparent"
									>
										{page.icon}
									</button>
								) : (
									!isReadOnly && (
										<button
											type="button"
											onClick={() => actions.setIcon(page)}
											className="-ml-2 mb-1 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground opacity-0 outline-none transition-[opacity,background-color,color] hover:bg-foreground/[0.05] hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 group-focus-within/header:opacity-100 group-hover/header:opacity-100 print:hidden [@media(hover:none)]:opacity-100"
										>
											<Smile className="size-4" aria-hidden="true" />
											{t('docs.ADD_ICON')}
										</button>
									)
								)}
								<textarea
									ref={titleRef}
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
									rows={1}
									className="block w-full resize-none overflow-hidden bg-transparent text-4xl font-bold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
								/>
								<p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground print:hidden">
									{isPrivate && (
										<span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-foreground/80">
											<Lock className="size-3" aria-hidden="true" />
											{t('docs.PRIVATE_PAGE')}
										</span>
									)}
									<span>{t('docs.UPDATED_AT', { date: updatedAtLabel })}</span>
									{!isFolder && stats.words > 0 && (
										<>
											<span aria-hidden="true">·</span>
											<span className="tabular-nums">{t('docs.WORD_COUNT', { count: stats.words })}</span>
											<span aria-hidden="true">·</span>
											<span className="tabular-nums">{t('docs.READ_TIME', { minutes: stats.minutes })}</span>
										</>
									)}
								</p>
							</header>

							{!isFolder && (
								<div ref={bodyRef}>
									{unsupported && <p className="mb-3 rounded-lg bg-foreground/[0.04] px-3 py-2 text-xs text-muted-foreground">{t('docs.UNSUPPORTED_CONTENT')}</p>}
									{isReadOnly && (
										<RichTextView value={page.contentHtml ?? ''} emptyState={<p className="text-sm text-muted-foreground">{t('docs.EMPTY_PAGE')}</p>} />
									)}
									{!isReadOnly && isLiveConnecting && <BodySkeleton />}
									{!isReadOnly && !isLiveConnecting && liveEditor && (
										<DocsEditorSurface
											// Its own instance: nothing of the live editor carries over to the autosave one, should live editing stop.
											key={`${page.id}:live`}
											value=""
											live={liveEditor}
											onUnsupported={onUnsupported}
											onChange={onLiveEditorChange}
											onReady={setEditorApi}
											mentions={mentions}
											placeholder={t('docs.EDITOR_PLACEHOLDER')}
											title={shownTitle}
										/>
									)}
									{!isReadOnly && !isLiveConnecting && !liveEditor && (
										<DocsEditorSurface
											key={`${page.id}:page`}
											value={autosave.restoredHtml ?? editorContent.html}
											json={editorContent.json}
											onUnsupported={onUnsupported}
											onChange={onEditorChange}
											onReady={setEditorApi}
											onSaveShortcut={() => void autosave.flushNow()}
											mentions={mentions}
											placeholder={t('docs.EDITOR_PLACEHOLDER')}
											title={shownTitle}
										/>
									)}
								</div>
							)}

							{(hasChildren || isFolder) && (
								<section aria-labelledby="docs-sub-pages" className={cn('print:hidden', !isFolder && 'mt-12 pt-6 hairline-t border-border')}>
									<h2 id="docs-sub-pages" className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										{t('docs.SUB_PAGES')}
									</h2>
									{children.length === 0 && <p className="mb-3 text-sm text-muted-foreground">{t('docs.FOLDER_EMPTY')}</p>}
									<ul className="mb-2 flex flex-col gap-px">
										{children.map((child) => (
											<li key={child.page.id}>
												<Link
													href={`/docs/${encodeURIComponent(child.page.id)}`}
													className="-mx-2 flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-foreground outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/25"
												>
													<DocsPageGlyph page={child.page} />
													<span className="min-w-0 flex-1 truncate underline decoration-foreground/15 underline-offset-4">
														{pageTitle(child.page, t('docs.UNTITLED'))}
													</span>
													{child.children.length > 0 && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{child.children.length}</span>}
												</Link>
											</li>
										))}
									</ul>
									{!page.isArchived && (
										<button type="button" onClick={() => actions.newSubPage(page)} className={cn(ADD_ROW_RECIPE, 'cursor-pointer')}>
											<Plus aria-hidden="true" />
											{t('docs.NEW_SUB_PAGE')}
										</button>
									)}
								</section>
							)}
						</article>

						{showsOutline && (
							<nav aria-label={t('docs.OUTLINE')} className="hidden w-52 shrink-0 xl:block print:hidden">
								<div className="sticky top-8">
									<h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('docs.OUTLINE')}</h2>
									<ul className="flex flex-col border-l border-border">
										{outline.map((item) => (
											<li key={item.index}>
												<button
													type="button"
													onClick={() => jumpToHeading(item)}
													className={cn(
														'-ml-px block w-full cursor-pointer truncate border-l border-transparent py-1 pr-2 text-left text-[13px] text-muted-foreground outline-none transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:border-primary focus-visible:text-foreground',
														item.level === 1 && 'pl-3 font-medium text-foreground/80',
														item.level === 2 && 'pl-3',
														item.level === 3 && 'pl-6'
													)}
												>
													{item.text}
												</button>
											</li>
										))}
									</ul>
								</div>
							</nav>
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
							// The pending draft is the text being replaced: it is not saved while the version is restored (it would
							// land over it), and it is dropped only once the restore succeeded — a failed restore keeps it.
							const release = autosave.holdForRestore();
							let restored = false;
							try {
								await actions.restoreVersion(page.id, versionId);
								restored = true;
								setLiveJson(null);
							} finally {
								release(restored);
							}
							toast.success(t('docs.VERSION_RESTORED'));
						}}
					/>
				</div>
			)}
		</div>
	);
}

function BodySkeleton() {
	const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-2/3'];
	return (
		<output aria-busy="true" className="flex min-h-[40vh] flex-col gap-3.5 py-1">
			{widths.map((width, at) => (
				<span key={at} className={cn('block h-3.5 animate-pulse rounded-full bg-foreground/[0.06]', width)} />
			))}
		</output>
	);
}

function SaveStateLabel({ state }: Readonly<{ state: DocsSaveState }>) {
	const t = useTranslations();
	const label =
		state === 'saving' ? t('docs.SAVING') : state === 'saved' ? t('docs.SAVED') : state === 'dirty' ? t('docs.UNSAVED') : state === 'error' ? t('docs.NOT_SAVED') : '';
	if (!label) return null;
	return (
		<span
			role="status"
			aria-live="polite"
			className={cn('mr-1 inline-flex shrink-0 items-center gap-1.5 text-xs', state === 'error' ? 'text-destructive' : 'text-muted-foreground')}
		>
			{state === 'saving' && <Spinner className="size-3 animate-spin" aria-hidden="true" />}
			{state === 'saved' && <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
			{state === 'dirty' && <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />}
			{state === 'error' && <CircleAlert className="size-3.5" aria-hidden="true" />}
			<span className="hidden sm:inline">{label}</span>
		</span>
	);
}

function Notice({ tone, icon, children }: Readonly<{ tone: 'warning' | 'muted'; icon?: ReactNode; children: ReactNode }>) {
	return (
		<div
			role={tone === 'warning' ? 'alert' : 'note'}
			className={cn(
				'mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm hairline-ring',
				tone === 'warning' ? 'bg-amber-500/10 text-foreground ring-amber-500/40' : 'bg-foreground/[0.03] text-muted-foreground ring-border'
			)}
		>
			{icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
			<div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">{children}</div>
		</div>
	);
}
