'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { ArrowLeft, Check, CircleAlert, Comment, FileText, History, Lock, MoreHorizontal, Plus, Sidebar, Smile, Spinner, Star, Trash } from '@/core/components/icons';
import { useDocsAutosave, useEditorPageContent, type DocsSaveState } from '@/core/hooks/docs/use-docs-autosave';
import { useDocsFollow, type DocsFollowAction, type DocsSpacesState } from '@/core/hooks/docs/use-docs-collaboration';
import { useDocsComments } from '@/core/hooks/docs/use-docs-comments';
import { useDocsLive } from '@/core/hooks/docs/use-docs-live';
import { useDocsZipExport } from '@/core/hooks/docs/use-docs-zip-export';
import { useDocsPage, useDocsPath } from '@/core/hooks/docs/use-docs-page';
import { useDocsRecent } from '@/core/hooks/docs/use-docs-recent';
import { useDocsMentionCandidates, useDocsScope } from '@/core/hooks/docs/use-docs-scope';
import type { DocsTreeState } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { liveAnchorResolverOf } from '@/core/lib/docs-live/anchor-resolver';
import { DOCS_LIVE_FIELD } from '@/core/lib/docs-live/config';
import { anchorBlocksOf, storedAnchorOf, threadPlaceOf, type DocsThreadPlace } from '@/core/lib/utils/docs-comment-anchors';
import { anchoredBlocksOf, openThreadOnBlock, threadOfComment, type DocsCommentThread } from '@/core/lib/utils/docs-comments';
import { offersZipExport } from '@/core/lib/utils/docs-export';
import { docsLinkTargetOf, docsPageUrl } from '@/core/lib/utils/docs-links';
import { documentToMarkdown, markdownFileName, mentionedEmployeeIds } from '@/core/lib/utils/docs-markdown';
import { DOCS_OUTLINE_SELECTOR, outlineOf, textStatsOf, type DocsOutlineItem } from '@/core/lib/utils/docs-outline';
import { pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentKind, EDocumentVisibility, type IDocumentNode, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { DocsCommentsPanel, type DocsPendingAnchor } from './docs-comments-panel';
import type { DocsCommentRange } from './docs-editor-extensions';
import type { DocsEditorApi, DocsEditorComments, DocsEditorLive } from './docs-editor-surface';
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
	/** On a phone, the tree opens as a drawer over the page. */
	onOpenTree?: () => void;
}

/** How long a block a link pointed at stays lit. */
const LINKED_BLOCK_LIT_MS = 4000;
/** How long the page is searched for a block a link or a thread points at. */
const BLOCK_SEARCH_MS = 12_000;
/** How many times, and how far apart, a draft is saved while a save already runs, before an export or a new anchor. */
const DRAFT_SAVE_ATTEMPTS = 20;
const DRAFT_SAVE_WAIT_MS = 300;
/** The save states that wait for the person: nothing is saved until they act. */
const SAVE_FAILURES: ReadonlySet<DocsSaveState> = new Set<DocsSaveState>(['conflict', 'locked', 'too-large', 'error']);

/** The selector of a block by its anchor, in the editor and in the read-only view (the platform's spelling too). */
function blockSelectorOf(blockId: string): string {
	const id = CSS.escape(blockId);
	return `[data-block-id="${id}"], [data-blockid="${id}"]`;
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
export function DocsPageView({ pageId, tree, actions, spaces = NO_SPACES, onOpenTree }: DocsPageViewProps) {
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
	const scope = useDocsScope();
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
	// Where the adoption of a fallen-back session's text stands: the autosave editor stays closed until it is done, so
	// nothing typed meanwhile can start another draft before it (which would leave the live text out).
	const [adoption, setAdoption] = useState<'waiting' | 'done' | 'failed'>('waiting');
	const [adoptionTry, setAdoptionTry] = useState(0);
	const adoptingRef = useRef(false);
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
		if (!fallenDoc || !pageWritable || adoption !== 'waiting' || adoptingRef.current) return;
		adoptingRef.current = true;
		let current = true;
		import('@/core/components/common/rich-editor/live-collaboration')
			.then(({ liveDocumentContent }) => {
				if (!current) return;
				const { json, html } = liveDocumentContent(fallenDoc, DOCS_LIVE_FIELD);
				const content = json as IDocumentNode;
				adoptDraft(html, content, mentionedEmployeeIds(content), liveClockRef.current ?? NEVER_SAVED_CLOCK);
				setAdoption('done');
			})
			.catch(() => {
				// The editor's code did not load (offline, a new deployment): the document stays, and Retry tries again.
				if (current) setAdoption('failed');
			})
			.finally(() => {
				if (current) adoptingRef.current = false;
			});
		return () => {
			current = false;
			adoptingRef.current = false;
		};
	}, [adoptDraft, adoption, adoptionTry, fallenDoc, pageWritable]);
	const awaitingAdoption = Boolean(fallenDoc) && pageWritable && adoption !== 'done';
	const retryAdoption = () => {
		setAdoption('waiting');
		setAdoptionTry((count) => count + 1);
	};

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

	// ---------------------------------------------------------------- comments and the places links point at

	const isPage = Boolean(page && page.kind === EDocumentKind.PAGE);
	const comments = useDocsComments(page ? { id: page.id, name: page.name } : null, isPage);
	const searchParams = useSearchParams();
	const linkTarget = useMemo(() => docsLinkTargetOf(searchParams?.toString() ?? ''), [searchParams]);
	const [showComments, setShowComments] = useState(linkTarget.comments || linkTarget.thread !== null);
	const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
	const [threadRequest, setThreadRequest] = useState(0);
	const askThread = useCallback((threadId: string) => {
		setActiveThreadId(threadId);
		setThreadRequest((count) => count + 1);
	}, []);
	const [pendingAnchor, setPendingAnchor] = useState<DocsPendingAnchor | null>(null);
	const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
	// A block (or a thread's range in it) to bring into sight; the count lets the same one be asked for again.
	const [scrollTarget, setScrollTarget] = useState<{ blockId: string; threadId?: string | null; count: number; fromLink: boolean } | null>(null);
	const anchoredBlocks = useMemo(() => anchoredBlocksOf(documentJson), [documentJson]);
	const openThreadCount = useMemo(() => comments.threads.filter((thread) => !thread.resolved).length, [comments.threads]);

	// Where each thread is on the page as it is now: by its range when it has one (found again with the platform's rules,
	// live by the shared document's relative positions first), else by the block its first line names.
	const anchorBlocks = useMemo(() => (documentJson ? anchorBlocksOf(documentJson) : null), [documentJson]);
	const liveAnchorDoc = isLiveEditing ? (liveSnapshot?.doc ?? null) : null;
	const liveResolver = useMemo(() => (liveAnchorDoc ? liveAnchorResolverOf(liveAnchorDoc, DOCS_LIVE_FIELD) : null), [liveAnchorDoc]);
	const { anchors } = comments;
	const threadPlaces = useMemo(() => {
		const places = new Map<string, DocsThreadPlace>();
		for (const thread of comments.threads) places.set(thread.id, threadPlaceOf(thread, anchors.get(thread.id), anchorBlocks, liveResolver));
		return places;
	}, [anchorBlocks, anchors, comments.threads, liveResolver]);
	const placeOf = useCallback(
		(thread: DocsCommentThread): DocsThreadPlace => threadPlaces.get(thread.id) ?? threadPlaceOf(thread, anchors.get(thread.id), anchorBlocks, liveResolver),
		[anchorBlocks, anchors, liveResolver, threadPlaces]
	);
	// The editor marks the blocks of the open threads without a range, and highlights the ranges of the others.
	const openBlockIds = useMemo(() => {
		const blocks = new Set<string>();
		for (const thread of comments.threads) if (!thread.resolved && thread.blockId && !anchors.has(thread.id)) blocks.add(thread.blockId);
		return [...blocks];
	}, [anchors, comments.threads]);
	const commentRanges = useMemo<DocsCommentRange[]>(
		() =>
			comments.threads.flatMap((thread) => {
				const anchor = thread.resolved ? undefined : anchors.get(thread.id);
				return anchor ? [{ threadId: thread.id, anchor: storedAnchorOf(anchor) }] : [];
			}),
		[anchors, comments.threads]
	);

	const revealBlock = useCallback((blockId: string, fromLink = false) => {
		setActiveBlockId(blockId);
		setScrollTarget((current) => ({ blockId, count: (current?.count ?? 0) + 1, fromLink }));
	}, []);

	/** A thread's place in sight: its range (lit by the editor), else its block (lit here). */
	const revealThread = useCallback(
		(thread: DocsCommentThread, fromLink = false) => {
			const place = placeOf(thread);
			if (!place.blockId) return;
			if (place.kind === 'range') {
				const blockId = place.blockId;
				setActiveBlockId(null);
				setScrollTarget((current) => ({ blockId, threadId: thread.id, count: (current?.count ?? 0) + 1, fromLink }));
				return;
			}
			revealBlock(place.blockId, fromLink);
		},
		[placeOf, revealBlock]
	);

	const openComments = useCallback(() => {
		setShowHistory(false);
		setShowComments(true);
	}, []);

	// A link to a block (`?block=`) brings it into sight and lights it a moment.
	const linkedBlock = linkTarget.block;
	const isPageShown = Boolean(page);
	useEffect(() => {
		if (!linkedBlock || !isPageShown) return;
		revealBlock(linkedBlock, true);
		const timer = setTimeout(() => setActiveBlockId((current) => (current === linkedBlock ? null : current)), LINKED_BLOCK_LIT_MS);
		return () => clearTimeout(timer);
	}, [isPageShown, linkedBlock, revealBlock]);

	// A link to a thread (`?thread=`, an Inbox entry) opens it once the comments are read, with its block in sight.
	const linkedThread = linkTarget.thread;
	const handledThreadRef = useRef<string | null>(null);
	useEffect(() => {
		// The ranges are waited for too, so the thread's text (not only its block) comes into sight.
		if (!linkedThread || !comments.isReady || !comments.anchorsSettled || handledThreadRef.current === linkedThread) return;
		handledThreadRef.current = linkedThread;
		const thread = threadOfComment(comments.threads, linkedThread);
		openComments();
		if (!thread) {
			toast(t('docs.THREAD_NOT_FOUND'));
			return;
		}
		askThread(thread.id);
		revealThread(thread, true);
	}, [askThread, comments.anchorsSettled, comments.isReady, comments.threads, linkedThread, openComments, revealThread, t]);
	useEffect(() => {
		if (linkTarget.comments) openComments();
	}, [linkTarget.comments, openComments]);

	// The block asked for, once the editor (or the read-only view) shows it.
	useEffect(() => {
		if (!scrollTarget) return;
		// The editor can take a while (a live session's first state): the block is looked for up to this long.
		const deadline = Date.now() + BLOCK_SEARCH_MS;
		let handle = 0;
		const find = () => {
			const range = scrollTarget.threadId ? bodyRef.current?.querySelector<HTMLElement>(`[data-thread-range="${CSS.escape(scrollTarget.threadId)}"]`) : null;
			const element = range ?? bodyRef.current?.querySelector<HTMLElement>(blockSelectorOf(scrollTarget.blockId));
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'center' });
				// The read-only view has no editor to light the block: its element is lit for a moment.
				if (!element.closest('.ProseMirror')) {
					element.classList.add('docs-active-block');
					setTimeout(() => element.classList.remove('docs-active-block'), LINKED_BLOCK_LIT_MS);
				}
				return;
			}
			if (Date.now() < deadline) {
				handle = requestAnimationFrame(find);
			} else if (scrollTarget.fromLink) {
				toast(t('docs.BLOCK_NOT_FOUND'));
			}
		};
		handle = requestAnimationFrame(find);
		return () => cancelAnimationFrame(handle);
	}, [scrollTarget, t]);

	const selectThread = useCallback(
		(thread: DocsCommentThread) => {
			askThread(thread.id);
			revealThread(thread);
		},
		[askThread, revealThread]
	);

	const copyText = useCallback(
		(text: string) => {
			// No clipboard (a page served without https) or a refused one: the person is told, never left with an old copy.
			const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
			if (!clipboard) {
				toast.error(t('docs.COPY_ERROR'));
				return;
			}
			clipboard
				.writeText(text)
				.then(() => toast(t('docs.LINK_COPIED')))
				.catch(() => toast.error(t('docs.COPY_ERROR')));
		},
		[t]
	);

	// The draft saved and settled (a save already running is waited for); false when it cannot be (a conflict, a lock, a
	// draft too large, an error).
	const saveStateRef = useRef(autosave.state);
	useEffect(() => {
		saveStateRef.current = autosave.state;
	});
	const { flushNow, hasDraft } = autosave;
	const saveDraftNow = useCallback(async (): Promise<boolean> => {
		for (let attempt = 0; attempt < DRAFT_SAVE_ATTEMPTS; attempt += 1) {
			const saved = await flushNow();
			if (saved && !hasDraft()) return true;
			if (SAVE_FAILURES.has(saveStateRef.current)) return false;
			await new Promise((resolve) => setTimeout(resolve, DRAFT_SAVE_WAIT_MS));
		}
		return false;
	}, [flushNow, hasDraft]);

	// A block given its anchor for a comment: live, the edit went with the session; otherwise the page is saved first.
	const holdAnchor = useCallback(async () => isLiveEditing || saveDraftNow(), [isLiveEditing, saveDraftNow]);

	const startComment = useCallback(() => {
		const anchor = editorApi?.anchorSelection() ?? null;
		setPendingAnchor(anchor);
		if (anchor) setActiveBlockId(anchor.blockId);
		openComments();
	}, [editorApi, openComments]);

	const copyBlockLink = useCallback(() => {
		const anchor = editorApi?.anchorSelection() ?? null;
		if (!anchor) return;
		// A block that just got its anchor is saved at once, so the link leads somewhere for whoever opens it.
		if (anchor.created) void holdAnchor();
		copyText(docsPageUrl(window.location.origin, pageId, { block: anchor.blockId }));
	}, [copyText, editorApi, holdAnchor, pageId]);

	// A marker or a highlighted range: the thread it names (a range's own), else the newest open one on the block.
	const openThreadOfBlock = useCallback(
		(blockId: string, threadId?: string) => {
			const thread = (threadId ? comments.threads.find((candidate) => candidate.id === threadId) : null) ?? openThreadOnBlock(comments.threads, blockId);
			openComments();
			// A range is lit by the editor; a block is lit here.
			setActiveBlockId(thread && placeOf(thread).kind === 'range' ? null : blockId);
			if (thread) askThread(thread.id);
		},
		[askThread, comments.threads, openComments, placeOf]
	);

	const editorComments = useMemo<DocsEditorComments | null>(
		() =>
			isPage
				? {
						openBlockIds,
						ranges: commentRanges,
						activeBlockId,
						activeThreadId,
						onOpenThread: openThreadOfBlock,
						onComment: startComment,
						onCopyBlockLink: copyBlockLink
					}
				: null,
		[activeBlockId, activeThreadId, commentRanges, copyBlockLink, isPage, openBlockIds, openThreadOfBlock, startComment]
	);
	const reader = useMemo(() => ({ employeeId: scope?.employeeId ?? null, userId: scope?.userId ?? null }), [scope?.employeeId, scope?.userId]);
	const blockText = useCallback((blockId: string) => anchoredBlocks.text.get(blockId) ?? null, [anchoredBlocks]);

	// The read-only view shows the stored HTML, which lacks the block anchors: a page whose JSON has them is rendered
	// from it (the editor's HTML code loads for that), so a link to a block finds it there too.
	const readOnlyNow = Boolean(page && (page.isLocked || page.isArchived || unsupported));
	const storedHtml = page?.contentHtml ?? '';
	const storedJson = page?.contentJson ?? null;
	const [anchoredHtml, setAnchoredHtml] = useState<{ json: IDocumentNode; html: string } | null>(null);
	useEffect(() => {
		if (!readOnlyNow || unsupported || !storedJson || anchoredBlocksOf(storedJson).order.length === 0) return;
		let current = true;
		import('./docs-editor-html')
			.then(({ editorHtmlOf }) => {
				if (current) setAnchoredHtml({ json: storedJson, html: editorHtmlOf(storedHtml, storedJson) });
			})
			.catch(() => undefined);
		return () => {
			current = false;
		};
	}, [readOnlyNow, storedHtml, storedJson, unsupported]);
	const readOnlyHtml = anchoredHtml && anchoredHtml.json === storedJson && !unsupported ? anchoredHtml.html : storedHtml;

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
		copyText(`${window.location.origin}${window.location.pathname}`);
	};

	// The page and its sub-pages, or the folder and what is in it, as a zip of Markdown files from the platform (the text
	// as saved: a page's pending draft goes first).
	const zipExport = useDocsZipExport();
	const isExporting = zipExport.isExporting;
	const exportSubtree = () => {
		if (!page) return;
		const isFolderPage = page.kind === EDocumentKind.FOLDER;
		void zipExport.run(page, { title, beforeExport: isFolderPage || isLiveEditing ? undefined : saveDraftNow });
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
					{onOpenTree ? (
						<button type="button" onClick={onOpenTree} className={cn(BAR_BUTTON, 'lg:hidden')} aria-label={t('docs.PAGES')} title={t('docs.PAGES')}>
							<Sidebar className="rtl:-scale-x-100" />
						</button>
					) : (
						<Link href="/docs?tree=1" className={cn(BAR_BUTTON, 'lg:hidden')} aria-label={t('docs.BACK')}>
							<ArrowLeft className="rtl:rotate-180" />
						</Link>
					)}
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
							onClick={() => {
								if (showComments) {
									setShowComments(false);
									setPendingAnchor(null);
								} else {
									openComments();
								}
							}}
							aria-pressed={showComments}
							aria-label={t('docs.COMMENTS')}
							title={t('docs.COMMENTS')}
							className={cn(BAR_BUTTON, 'relative w-auto min-w-7 gap-1 px-1.5', showComments && 'bg-foreground/[0.08] text-foreground')}
						>
							<Comment />
							{openThreadCount > 0 && <span className="text-xs tabular-nums">{openThreadCount}</span>}
						</button>
					)}
					{!isFolder && (
						<button
							type="button"
							onClick={() => {
								setShowComments(false);
								setShowHistory((current) => !current);
							}}
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
									{offersZipExport(page, hasChildren) && (
										<DropdownMenuItem disabled={isExporting} onClick={exportSubtree}>
											{t('docs.EXPORT_WITH_SUB_PAGES')}
										</DropdownMenuItem>
									)}
									<DropdownMenuItem onClick={() => window.print()}>{t('docs.PRINT')}</DropdownMenuItem>
								</>
							)}
							{isFolder && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem disabled={isExporting} onClick={exportSubtree}>
										{t('docs.EXPORT_FOLDER_ZIP')}
									</DropdownMenuItem>
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
										<RichTextView value={readOnlyHtml} emptyState={<p className="text-sm text-muted-foreground">{t('docs.EMPTY_PAGE')}</p>} />
									)}
									{!isReadOnly && awaitingAdoption && adoption === 'failed' && (
										<Notice tone="warning">
											<span>{t('docs.SAVE_ERROR')}</span>
											<Button type="button" size="sm" variant="outline" onClick={retryAdoption}>
												{t('docs.RETRY')}
											</Button>
										</Notice>
									)}
									{!isReadOnly && (isLiveConnecting || (awaitingAdoption && adoption === 'waiting')) && <BodySkeleton />}
									{!isReadOnly && !isLiveConnecting && liveEditor && (
										<DocsEditorSurface
											// Its own instance: nothing of the live editor carries over to the autosave one, should live editing stop.
											key={`${page.id}:live`}
											value=""
											live={liveEditor}
											comments={editorComments}
											onUnsupported={onUnsupported}
											onChange={onLiveEditorChange}
											onReady={setEditorApi}
											mentions={mentions}
											placeholder={t('docs.EDITOR_PLACEHOLDER')}
											title={shownTitle}
										/>
									)}
									{!isReadOnly && !isLiveConnecting && !liveEditor && !awaitingAdoption && (
										<DocsEditorSurface
											key={`${page.id}:page`}
											value={autosave.restoredHtml ?? editorContent.html}
											json={editorContent.json}
											// A kept draft is not the stored page: only the stored page opens from its JSON.
											sourceJson={autosave.restoredHtml === null ? editorContent.json : null}
											comments={editorComments}
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
			{showComments && !showHistory && !isFolder && (
				<div className="absolute inset-0 z-10 bg-background lg:static lg:z-auto lg:w-80 lg:shrink-0 print:hidden">
					<DocsCommentsPanel
						comments={comments}
						blockOrder={anchoredBlocks.order}
						blockText={blockText}
						placeOf={placeOf}
						reader={reader}
						activeThreadId={activeThreadId}
						activeThreadRequest={threadRequest}
						onSelectThread={selectThread}
						beforePost={holdAnchor}
						pendingAnchor={pendingAnchor}
						onClearPending={() => {
							setPendingAnchor(null);
							setActiveBlockId(null);
						}}
						canComment={!page.isArchived}
						onCopyThreadLink={(thread) => copyText(docsPageUrl(window.location.origin, page.id, { thread: thread.id }))}
						onClose={() => {
							setShowComments(false);
							setPendingAnchor(null);
							setActiveThreadId(null);
							setActiveBlockId(null);
						}}
					/>
				</div>
			)}
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
