'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Button } from '@/core/components/duplicated-components/_button';
import { FileText, Plus } from '@/core/components/icons';
import { useDocsActions } from '@/core/hooks/docs/use-docs-actions';
import { useDocsAvailability } from '@/core/hooks/docs/use-docs-availability';
import { useDocsFavorites } from '@/core/hooks/docs/use-docs-favorites';
import { useDocsExpanded, useDocsRecent } from '@/core/hooks/docs/use-docs-recent';
import { useDocsScope } from '@/core/hooks/docs/use-docs-scope';
import { useDocsTree } from '@/core/hooks/docs/use-docs-tree';
import { cn } from '@/core/lib/helpers';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import { lastVisited, localStorageOrNull } from '@/core/lib/utils/docs-recent';
import { ancestorIdsOf, pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { DocsIconDialog } from './docs-icon-dialog';
import { DocsMoveDialog, DocsNameDialog } from './docs-dialogs';
import { DocsPageView, type DocsPageViewActions } from './docs-page-view';
import { DocsTrash } from './docs-trash';
import { DocsTreePane } from './docs-tree-pane';
import type { DocsTreeActions } from './docs-tree';

export type DocsView = 'home' | 'page' | 'trash';

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
	const { expanded, toggle, setOpen, expandAll } = useDocsExpanded();
	const favorites = useDocsFavorites();
	const { recentIds, forget } = useDocsRecent();
	const actions = useDocsActions();

	const [renaming, setRenaming] = useState<IDocumentPage | null>(null);
	const [moving, setMoving] = useState<IDocumentPage | null>(null);
	const [iconOf, setIconOf] = useState<IDocumentPage | null>(null);

	useEffect(() => {
		if (!enabled) router.replace('/');
	}, [enabled, router]);

	// `/docs` opens the page last visited on this device, once the tree says it still exists.
	useEffect(() => {
		if (view !== 'home' || !scope || tree.isLoading || tree.pages.length === 0) return;
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
		(error: unknown, fallbackKey: string) => {
			const message = error instanceof Error && error.message ? error.message : t(fallbackKey);
			toast.error(message);
		},
		[t]
	);

	const createAndOpen = useCallback(
		async (parentId: string | null, visibility: EDocumentVisibility) => {
			try {
				const page = await actions.createPage({ name: t('docs.UNTITLED'), parentId, visibility });
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
			drop: (id, parentId) => {
				void actions
					.movePage(id, parentId)
					.then(() => {
						if (parentId) setOpen(parentId, true);
					})
					.catch((error: unknown) => fail(error, 'docs.MOVE_ERROR'));
			}
		}),
		[actions, createAndOpen, duplicate, fail, reorder, setOpen, setVisibility, toggleFavorite, trash, tree.byId]
	);

	const pageActions = useMemo<DocsPageViewActions>(
		() => ({
			rename: (id, name) => actions.updatePage(id, { name }),
			setIcon: setIconOf,
			setVisibility,
			moveTo: setMoving,
			duplicate,
			trash,
			restore,
			restoreVersion: actions.restoreVersion,
			toggleFavorite,
			isFavorite: favorites.isFavorite
		}),
		[actions, duplicate, favorites.isFavorite, restore, setVisibility, toggleFavorite, trash]
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

	const showsPane = view === 'home';

	return (
		<PageLayout title={t('docs.TITLE')} className="min-h-0 flex-1 p-0" childrenClassName="h-full min-h-0">
			<div className="relative flex h-full min-h-0">
				<aside className={cn('h-full shrink-0 border-r border-border bg-background print:hidden', showsPane ? 'flex w-full lg:w-72' : 'hidden lg:flex lg:w-72')}>
					<DocsTreePane
						tree={tree}
						activeId={pageId}
						expanded={expanded}
						onToggle={toggle}
						onSetOpen={setOpen}
						favoriteIds={favorites.favoriteIds}
						recentIds={recentIds}
						actions={treeActions}
						onNewPage={(parentId, visibility) => void createAndOpen(parentId, visibility)}
					/>
				</aside>
				<main className={cn('relative min-w-0 flex-1', showsPane ? 'hidden lg:block' : 'block')}>
					{view === 'page' && pageId && <DocsPageView key={pageId} pageId={pageId} tree={tree} actions={pageActions} />}
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
						<div className="flex h-full items-center justify-center p-6">
							<AnimatedEmptyState
								title={t('docs.WELCOME_TITLE')}
								message={t('docs.WELCOME_TEXT')}
								icon={<FileText className="size-10 text-muted-foreground" />}
								showBorder={false}
							/>
							<div className="absolute bottom-1/3 flex gap-2">
								<Button type="button" onClick={() => void createAndOpen(null, EDocumentVisibility.ORGANIZATION)}>
									<Plus className="size-4" />
									{t('docs.NEW_PAGE')}
								</Button>
								<Button type="button" variant="outline" asChild>
									<Link href="/docs/trash">{t('docs.TRASH')}</Link>
								</Button>
							</div>
						</div>
					)}
				</main>
			</div>

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
