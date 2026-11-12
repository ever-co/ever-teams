'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { useDocsActions } from '@/core/hooks/docs/use-docs-actions';
import { useDocsAvailability } from '@/core/hooks/docs/use-docs-availability';
import { useDocsSpaces } from '@/core/hooks/docs/use-docs-collaboration';
import { useDocsFavorites } from '@/core/hooks/docs/use-docs-favorites';
import { useDocsExpanded, useDocsRecent } from '@/core/hooks/docs/use-docs-recent';
import { useDocsScope } from '@/core/hooks/docs/use-docs-scope';
import { useDocsTree } from '@/core/hooks/docs/use-docs-tree';
import { useDocsZipExport } from '@/core/hooks/docs/use-docs-zip-export';
import { cn } from '@/core/lib/helpers';
import { isDocsEnabled, isDocsImportEnabled } from '@/core/lib/utils/docs-enabled';
import { errorKeyOf } from '@/core/lib/utils/docs-import';
import { useDocsImportAvailability, useDocsImportRun } from '@/core/hooks/docs/use-docs-import';
import { lastVisited, localStorageOrNull } from '@/core/lib/utils/docs-recent';
import { ancestorIdsOf, pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import type { IDocumentImport } from '@/core/types/interfaces/common/docs-import';
import { DocsHome, type DocsNewPageRequest } from './docs-home';
import { DocsIconDialog } from './docs-icon-dialog';
import { DocsImportDialog } from './docs-import-dialog';
import { DocsMoveDialog, DocsNameDialog } from './docs-dialogs';
import { DocsPageView, type DocsPageViewActions } from './docs-page-view';
import { DocsTrash } from './docs-trash';
import { DocsTreePane } from './docs-tree-pane';
import type { DocsTreeActions } from './docs-tree';

export type DocsView = 'home' | 'page' | 'trash';

/** Tailwind's `lg`, where the tree is a sidebar beside the page. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/** The Docs pages: the tree pane and, beside it, the page, the trash, or the welcome. */
export function DocsPage({ view }: Readonly<{ view: DocsView }>) {
	const t = useTranslations();
	const router = useRouter();
	const params = useParams<{ pageId?: string }>();
	const pageId = view === 'page' ? (params?.pageId ?? null) : null;
	const enabled = isDocsEnabled();
	const availability = useDocsAvailability(enabled);
	const scope = useDocsScope();
	const tree = useDocsTree(enabled && availability !== 'unavailable');
	const spaces = useDocsSpaces(enabled && availability === 'available');
	// The import of exported workspaces: this deployment's flag, then the platform's probe (404 = not offered).
	const importing = useDocsImportAvailability(isDocsImportEnabled() && availability === 'available');
	/** The import dialog, with the page it may land under (`null` parent: from the home). */
	const [importInto, setImportInto] = useState<{ parent: { id: string; name: string } | null } | null>(null);
	const { expanded, toggle, setOpen, expandAll } = useDocsExpanded();
	const favorites = useDocsFavorites();
	const { recentIds, forget } = useDocsRecent();
	const actions = useDocsActions();
	const { run: exportZip } = useDocsZipExport();

	// Below the large breakpoint the tree and the home do not fit side by side: the tree shows first, and its Home row
	// swaps it for the home, which has a way back.
	const [homeOnPhone, setHomeOnPhone] = useState(false);
	// A page's Back leads to the tree: the swap does not outlive the home view.
	if (homeOnPhone && view !== 'home') setHomeOnPhone(false);
	// On a phone the tree opens over the page as a drawer; opening a page from it closes it.
	const [treeDrawer, setTreeDrawer] = useState<{ open: boolean; pageId: string | null }>({ open: false, pageId });
	if (treeDrawer.pageId !== pageId) setTreeDrawer({ open: false, pageId });
	const isTreeDrawerOpen = treeDrawer.open && view === 'page';
	const [renaming, setRenaming] = useState<IDocumentPage | null>(null);
	const [moving, setMoving] = useState<IDocumentPage | null>(null);
	const [iconOf, setIconOf] = useState<IDocumentPage | null>(null);

	useEffect(() => {
		if (!enabled) router.replace('/');
	}, [enabled, router]);

	// The drawer is modal: the focus goes into it (the page behind is inert) and back to what opened it.
	const drawerRef = useRef<HTMLElement | null>(null);
	useEffect(() => {
		if (!isTreeDrawerOpen) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const target = drawerRef.current?.querySelector<HTMLElement>('[aria-current="page"], a[href], button:not([disabled])');
		target?.focus();
		const close = () => setTreeDrawer((current) => ({ ...current, open: false }));
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close();
		};
		// On a large screen the tree is the sidebar: the drawer (and the inert page) ends there.
		const desktop = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null;
		if (desktop?.matches) close();
		const onDesktop = (event: MediaQueryListEvent) => {
			if (event.matches) close();
		};
		document.addEventListener('keydown', onKeyDown);
		desktop?.addEventListener('change', onDesktop);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			desktop?.removeEventListener('change', onDesktop);
			if (opener?.isConnected) opener.focus();
		};
	}, [isTreeDrawerOpen]);

	// `/docs` opens the page last visited on this device, once the tree says it still exists — except when the person
	// asked for the tree (`?tree=1`, the Back of a page on a phone, where the tree is hidden under an open page).
	useEffect(() => {
		const wantsTree = new URLSearchParams(window.location.search).get('tree') === '1';
		if (view !== 'home' || wantsTree || !scope || tree.isLoading || tree.pages.length === 0) return;
		const last = lastVisited(localStorageOrNull(), scope.organizationId, new Set(tree.byId.keys()));
		if (last) router.replace(`/docs/${encodeURIComponent(last)}`);
	}, [router, scope, tree.byId, tree.isLoading, tree.pages.length, view]);

	// The open page is revealed in the tree.
	useEffect(() => {
		if (!pageId || tree.pages.length === 0) return;
		const ancestors = ancestorIdsOf(tree.tree, pageId);
		if (ancestors.length > 0) expandAll(ancestors);
	}, [expandAll, pageId, tree.pages.length, tree.tree]);

	const fail = useCallback(
		(error: unknown, fallbackKey: DottedLanguageObjectStringPaths) => {
			const message = error instanceof Error && error.message ? error.message : t(fallbackKey);
			toast.error(message);
		},
		[t]
	);

	const createAndOpen = useCallback(
		async (
			parentId: string | null,
			visibility: EDocumentVisibility,
			start: Pick<DocsNewPageRequest, 'name' | 'icon' | 'content'> = {},
			organizationTeamId?: string | null
		) => {
			try {
				const page = await actions.createPage({ name: start.name ?? t('docs.UNTITLED'), parentId, visibility, organizationTeamId, icon: start.icon, content: start.content });
				if (parentId) setOpen(parentId, true);
				router.push(`/docs/${encodeURIComponent(page.id)}`);
			} catch (error) {
				fail(error, 'docs.CREATE_ERROR');
			}
		},
		[actions, fail, router, setOpen, t]
	);

	const trash = useCallback(
		async (page: IDocumentPage) => {
			try {
				await actions.trashPage(page.id);
				forget(page.id);
				if (page.id === pageId) router.push('/docs');
				toast(t('docs.TRASHED', { title: pageTitle(page, t('docs.UNTITLED')) }), {
					action: {
						label: t('docs.UNDO'),
						onClick: () => void actions.restorePage(page.id).catch((error: unknown) => fail(error, 'docs.RESTORE_ERROR'))
					}
				});
			} catch (error) {
				fail(error, 'docs.TRASH_ERROR');
			}
		},
		[actions, fail, forget, pageId, router, t]
	);

	const restore = useCallback(
		async (page: IDocumentPage) => {
			try {
				await actions.restorePage(page.id);
				toast.success(t('docs.RESTORED', { title: pageTitle(page, t('docs.UNTITLED')) }));
			} catch (error) {
				fail(error, 'docs.RESTORE_ERROR');
			}
		},
		[actions, fail, t]
	);

	const duplicate = useCallback(
		async (page: IDocumentPage, deep: boolean) => {
			try {
				const copy = await actions.duplicatePage(page.id, { deep, name: t('docs.COPY_OF', { title: pageTitle(page, t('docs.UNTITLED')) }) });
				router.push(`/docs/${encodeURIComponent(copy.id)}`);
			} catch (error) {
				fail(error, 'docs.DUPLICATE_ERROR');
			}
		},
		[actions, fail, router, t]
	);

	const setVisibility = useCallback(
		async (page: IDocumentPage, visibility: EDocumentVisibility) => {
			try {
				await actions.updatePage(page.id, { visibility });
			} catch (error) {
				fail(error, 'docs.UPDATE_ERROR');
			}
		},
		[actions, fail]
	);

	const moveToSpace = useCallback(
		async (page: IDocumentPage, visibility: EDocumentVisibility, organizationTeamId: string | null) => {
			try {
				await actions.moveToSpace(page.id, visibility, organizationTeamId);
			} catch (error) {
				fail(error, 'docs.MOVE_ERROR');
			}
		},
		[actions, fail]
	);

	const reorder = useCallback(
		async (page: IDocumentPage, direction: 'up' | 'down') => {
			try {
				await actions.reorderPage(page.id, direction);
			} catch (error) {
				fail(error, 'docs.UPDATE_ERROR');
			}
		},
		[actions, fail]
	);

	const toggleFavorite = useCallback(
		async (id: string) => {
			try {
				await favorites.toggleFavorite(id);
			} catch (error) {
				fail(error, 'docs.UPDATE_ERROR');
			}
		},
		[fail, favorites]
	);

	const treeActions = useMemo<DocsTreeActions>(
		() => ({
			newSubPage: (parentId) => void createAndOpen(parentId, tree.byId.get(parentId)?.visibility ?? EDocumentVisibility.ORGANIZATION),
			rename: setRenaming,
			changeIcon: setIconOf,
			toggleFavorite: (page) => void toggleFavorite(page.id),
			moveUp: (page) => void reorder(page, 'up'),
			moveDown: (page) => void reorder(page, 'down'),
			moveTo: setMoving,
			duplicate: (page, deep) => void duplicate(page, deep),
			setVisibility: (page, visibility) => void setVisibility(page, visibility),
			trash: (page) => void trash(page),
			// A folder holds no text of its own: nothing waits to be saved before its zip.
			exportZip: (page) => void exportZip(page),
			drop: (id, parentId) => {
				void actions
					.movePage(id, parentId)
					.then(() => {
						if (parentId) setOpen(parentId, true);
					})
					.catch((error: unknown) => fail(error, 'docs.MOVE_ERROR'));
			},
			place: (id, targetId, position) => {
				void actions
					.placePage(id, targetId, position)
					.then((placement) => {
						if (placement?.parentId) setOpen(placement.parentId, true);
					})
					.catch((error: unknown) => fail(error, 'docs.MOVE_ERROR'));
			}
		}),
		[actions, createAndOpen, duplicate, exportZip, fail, reorder, setOpen, setVisibility, toggleFavorite, trash, tree.byId]
	);

	// The import run is the page's, so closing its dialog keeps it. When an import is over the tree is read again (once
	// per import); one that ends while its dialog is closed says so.
	const { retry: retryTree } = tree;
	const importOpenRef = useRef(false);
	useEffect(() => {
		importOpenRef.current = importInto !== null;
	}, [importInto]);
	const importRun = useDocsImportRun(
		useCallback(
			(finished: IDocumentImport) => {
				retryTree();
				if (importOpenRef.current) return;
				if (finished.status === 'FAILED') toast.error(t(errorKeyOf(finished.errorCode)));
				else toast.success(t('docs.IMPORT.SUMMARY', { imported: finished.importedCount, skipped: finished.skippedCount, failed: finished.failedCount }));
			},
			[retryTree, t]
		)
	);
	const closeImport = useCallback(() => {
		// An upload or an import still running stays, for the dialog's next opening; a finished one is put away.
		if (!importRun.inProgress) importRun.reset();
		setImportInto(null);
	}, [importRun]);

	const pageActions = useMemo<DocsPageViewActions>(
		() => ({
			rename: (id, name) => actions.updatePage(id, { name }),
			setIcon: setIconOf,
			setVisibility,
			moveToSpace,
			moveTo: setMoving,
			duplicate,
			trash,
			restore,
			restoreVersion: actions.restoreVersion,
			toggleFavorite,
			isFavorite: favorites.isFavorite,
			newSubPage: (page) => void createAndOpen(page.id, page.visibility, {}, page.organizationTeamId),
			importHere: importing.available ? (page) => setImportInto({ parent: { id: page.id, name: page.name } }) : undefined
		}),
		[actions, createAndOpen, duplicate, favorites.isFavorite, importing.available, moveToSpace, restore, setVisibility, toggleFavorite, trash]
	);

	if (!enabled) return null;

	if (availability === 'unavailable') {
		return (
			<PageLayout title={t('docs.TITLE')} className="min-h-0 flex-1">
				<div className="flex h-full items-center justify-center p-6">
					<AnimatedEmptyState title={t('docs.UNAVAILABLE_TITLE')} message={t('docs.UNAVAILABLE_TEXT')} showBorder={false} />
				</div>
			</PageLayout>
		);
	}

	const showsPane = view === 'home' && !homeOnPhone;

	return (
		<PageLayout fill title={t('docs.TITLE')} className="p-0">
			<div className="relative flex h-full min-h-0">
				{isTreeDrawerOpen && (
					<button
						type="button"
						aria-label={t('docs.CLOSE')}
						onClick={() => setTreeDrawer((current) => ({ ...current, open: false }))}
						className="fixed inset-0 z-30 cursor-default bg-black/30 lg:hidden print:hidden"
					/>
				)}
				<aside
					ref={drawerRef}
					role={isTreeDrawerOpen ? 'dialog' : undefined}
					aria-modal={isTreeDrawerOpen ? true : undefined}
					aria-label={isTreeDrawerOpen ? t('docs.PAGES') : undefined}
					className={cn(
						'h-full shrink-0 border-r border-border bg-background print:hidden',
						showsPane && 'flex w-full lg:w-72',
						!showsPane && !isTreeDrawerOpen && 'hidden lg:flex lg:w-72',
						!showsPane && isTreeDrawerOpen && 'fixed inset-y-0 start-0 z-40 flex w-[min(20rem,85vw)] shadow-xl lg:static lg:z-auto lg:w-72 lg:shadow-none'
					)}
				>
					<DocsTreePane
						tree={tree}
						activeId={pageId}
						expanded={expanded}
						onToggle={toggle}
						onSetOpen={setOpen}
						favoriteIds={favorites.favoriteIds}
						recentIds={recentIds}
						actions={treeActions}
						teamSpaces={spaces.teamSpaces}
						onNewPage={(parentId, visibility, organizationTeamId) => void createAndOpen(parentId, visibility, {}, organizationTeamId)}
						onHome={() => setHomeOnPhone(true)}
					/>
				</aside>
				<main inert={isTreeDrawerOpen} className={cn('relative min-w-0 flex-1', showsPane ? 'hidden lg:block' : 'block')}>
					{view === 'page' && pageId && (
						<DocsPageView
							key={pageId}
							pageId={pageId}
							tree={tree}
							actions={pageActions}
							spaces={spaces}
							onOpenTree={() => setTreeDrawer({ open: true, pageId })}
						/>
					)}
					{view === 'trash' && (
						<DocsTrash
							onRestore={restore}
							onDelete={async (page) => {
								try {
									await actions.deletePage(page.id, 'subtree');
									forget(page.id);
								} catch (error) {
									fail(error, 'docs.DELETE_ERROR');
								}
							}}
						/>
					)}
					{view === 'home' && (
						<DocsHome
							tree={tree}
							favoriteIds={favorites.favoriteIds}
							onNewPage={({ visibility, ...start }) => createAndOpen(null, visibility, start)}
							onImport={importing.available ? () => setImportInto({ parent: null }) : undefined}
							onBack={() => setHomeOnPhone(false)}
						/>
					)}
				</main>
			</div>

			{importing.available && importInto !== null && (
				<DocsImportDialog
					open
					maxZipBytes={importing.maxZipBytes}
					parent={importInto?.parent ?? null}
					teamSpaces={spaces.available ? spaces.teamSpaces : []}
					run={importRun}
					onOpenPage={(id) => {
						closeImport();
						router.push(`/docs/${encodeURIComponent(id)}`);
					}}
					onClose={closeImport}
				/>
			)}

			<DocsNameDialog
				open={renaming !== null}
				title={t('docs.RENAME')}
				initialValue={renaming?.name ?? ''}
				submitLabel={t('docs.SAVE')}
				onSubmit={async (name) => {
					if (!renaming) return;
					try {
						await actions.updatePage(renaming.id, { name });
					} catch (error) {
						fail(error, 'docs.UPDATE_ERROR');
					}
				}}
				onClose={() => setRenaming(null)}
			/>
			<DocsMoveDialog
				open={moving !== null}
				tree={tree.tree}
				page={moving}
				onMove={async (parentId) => {
					if (!moving) return;
					try {
						await actions.movePage(moving.id, parentId);
						if (parentId) setOpen(parentId, true);
					} catch (error) {
						fail(error, 'docs.MOVE_ERROR');
					}
				}}
				onClose={() => setMoving(null)}
			/>
			<DocsIconDialog
				open={iconOf !== null}
				hasIcon={Boolean(iconOf?.icon)}
				onPick={async (emoji) => {
					if (!iconOf) return;
					try {
						await actions.updatePage(iconOf.id, { icon: emoji });
					} catch (error) {
						fail(error, 'docs.UPDATE_ERROR');
					}
				}}
				onClose={() => setIconOf(null)}
			/>
		</PageLayout>
	);
}
