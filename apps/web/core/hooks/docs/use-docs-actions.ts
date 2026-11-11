'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { entityFilesService } from '@/core/services/client/api/documents/entity-files.service';
import { buildDocTree, nextIndexUnder, reorderedIds, siblingsOf } from '@/core/lib/utils/docs-tree';
import {
	EDocumentKind,
	EDocumentVisibility,
	type IDocumentNode,
	type IDocumentPage,
	type IDocumentUpdateInput,
	type TDocumentDeleteStrategy
} from '@/core/types/interfaces/common/docs';
import { noteLocalWrite } from './use-docs-autosave';
import { useDocsScope } from './use-docs-scope';

/** What the Docs pages do to the tree and to one page; every write answers the platform's page and refreshes the caches. */
export function useDocsActions() {
	const queryClient = useQueryClient();
	const scope = useDocsScope();
	const tenantId = scope?.tenantId;
	const organizationId = scope?.organizationId;

	const treeKey = queryKeys.docs.tree(tenantId, organizationId);
	const trashKey = queryKeys.docs.trash(tenantId, organizationId);

	const invalidateTree = useCallback(() => queryClient.invalidateQueries({ queryKey: treeKey }), [queryClient, treeKey]);
	const invalidateTrash = useCallback(() => queryClient.invalidateQueries({ queryKey: trashKey }), [queryClient, trashKey]);

	const treePages = useCallback(() => queryClient.getQueryData<IDocumentPage[]>(treeKey) ?? [], [queryClient, treeKey]);

	/** Writes a page into the tree list (new or changed) and into its own cache. */
	const putPage = useCallback(
		(page: IDocumentPage) => {
			// This tab's own write moved the page's clock: its autosave follows it (see `noteLocalWrite`).
			noteLocalWrite(page.id, queryClient.getQueryData<IDocumentPage>(queryKeys.docs.page(tenantId, page.id))?.updatedAt, page.updatedAt);
			queryClient.setQueryData<IDocumentPage[]>(treeKey, (current) => {
				if (!current) return current;
				const at = current.findIndex((item) => item.id === page.id);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars -- drops the content fields from the listed page
				const { contentJson: _json, contentHtml: _html, ...listed } = page;
				if (at < 0) return [...current, listed];
				return current.map((item) => (item.id === page.id ? { ...item, ...listed } : item));
			});
			queryClient.setQueryData<IDocumentPage>(queryKeys.docs.page(tenantId, page.id), (current) =>
				current ? { ...current, ...page, contentJson: page.contentJson ?? current.contentJson, contentHtml: page.contentHtml ?? current.contentHtml } : current
			);
		},
		[queryClient, tenantId, treeKey]
	);

	const dropFromTree = useCallback(
		(pageId: string) => {
			queryClient.setQueryData<IDocumentPage[]>(treeKey, (current) => {
				if (!current) return current;
				const tree = buildDocTree(current);
				const gone = new Set<string>([pageId]);
				const walk = (id: string) => {
					for (const child of tree.byId.get(id)?.children ?? []) {
						gone.add(child.page.id);
						walk(child.page.id);
					}
				};
				walk(pageId);
				return current.filter((item) => !gone.has(item.id));
			});
		},
		[queryClient, treeKey]
	);

	/** A new page at the end of its siblings; the caller opens it. */
	const createPage = useCallback(
		async (input: {
			name: string;
			parentId?: string | null;
			visibility?: EDocumentVisibility;
			/** With `visibility: TEAM` (or under a team page): the team space it goes in. */
			organizationTeamId?: string | null;
			icon?: string | null;
			/** The starting text of a page made from a template; an empty page without it. */
			content?: { contentJson: IDocumentNode; contentHtml: string };
		}) => {
			const tree = buildDocTree(treePages());
			const parentId = input.parentId ?? null;
			const parent = parentId ? tree.byId.get(parentId)?.page : undefined;
			const asked = input.visibility ?? parent?.visibility ?? EDocumentVisibility.ORGANIZATION;
			// A team page names its team (the one asked, or its parent's); without one it goes in the workspace.
			const teamId = asked === EDocumentVisibility.TEAM ? (input.organizationTeamId ?? parent?.organizationTeamId ?? null) : null;
			const visibility = asked === EDocumentVisibility.TEAM && !teamId ? EDocumentVisibility.ORGANIZATION : asked;
			const page = await docsService.create({
				kind: EDocumentKind.PAGE,
				name: input.name,
				parentId,
				index: nextIndexUnder(tree, parentId),
				visibility,
				...(teamId ? { organizationTeamId: teamId } : {}),
				...(input.icon ? { icon: input.icon } : {}),
				contentJson: input.content?.contentJson ?? { type: 'doc', content: [{ type: 'paragraph' }] },
				contentHtml: input.content?.contentHtml ?? ''
			});
			putPage(page);
			return page;
		},
		[putPage, treePages]
	);

	const updatePage = useCallback(
		async (pageId: string, input: IDocumentUpdateInput) => {
			const page = await docsService.update(pageId, input);
			putPage(page);
			return page;
		},
		[putPage]
	);

	const movePage = useCallback(
		async (pageId: string, parentId: string | null) => {
			const tree = buildDocTree(treePages());
			const page = await docsService.move(pageId, { parentId, index: nextIndexUnder(tree, parentId) });
			putPage(page);
			await invalidateTree();
			return page;
		},
		[invalidateTree, putPage, treePages]
	);

	/** One step among its siblings; false when it is already at that end. */
	const reorderPage = useCallback(
		async (pageId: string, direction: 'up' | 'down') => {
			const pages = treePages();
			const tree = buildDocTree(pages);
			const parentId = tree.byId.get(pageId)?.page.parentId ?? null;
			const siblingIds = siblingsOf(tree, parentId).map((node) => node.page.id);
			const ordered = reorderedIds(siblingIds, pageId, direction);
			if (!ordered) return false;
			const indexOf = new Map(ordered.map((id, index) => [id, index]));
			queryClient.setQueryData<IDocumentPage[]>(treeKey, (current) =>
				current ? current.map((item) => (indexOf.has(item.id) ? { ...item, index: indexOf.get(item.id) as number } : item)) : current
			);
			try {
				await docsService.reorder(parentId, ordered);
			} finally {
				await invalidateTree();
			}
			return true;
		},
		[invalidateTree, queryClient, treeKey, treePages]
	);

	const duplicatePage = useCallback(
		async (pageId: string, options: { deep: boolean; name?: string }) => {
			const page = await docsService.duplicate(pageId, { deep: options.deep, name: options.name });
			await invalidateTree();
			return page;
		},
		[invalidateTree]
	);

	/** Into the trash, with its sub-pages. */
	const trashPage = useCallback(
		async (pageId: string) => {
			const page = await docsService.archive(pageId);
			dropFromTree(pageId);
			// The open pages (this one and its sub-pages) read their archived state again.
			await Promise.all([invalidateTree(), invalidateTrash(), queryClient.invalidateQueries({ queryKey: ['docs', 'page'] })]);
			return page;
		},
		[dropFromTree, invalidateTrash, invalidateTree, queryClient]
	);

	const restorePage = useCallback(
		async (pageId: string) => {
			const page = await docsService.unarchive(pageId);
			// The open page leaves its Trash notice at once; its sub-pages read their state again.
			queryClient.setQueryData<IDocumentPage>(queryKeys.docs.page(tenantId, pageId), (current) => (current ? { ...current, ...page, contentJson: page.contentJson ?? current.contentJson, contentHtml: page.contentHtml ?? current.contentHtml } : current));
			await Promise.all([invalidateTree(), invalidateTrash(), queryClient.invalidateQueries({ queryKey: ['docs', 'page'] })]);
			return page;
		},
		[invalidateTrash, invalidateTree, queryClient, tenantId]
	);

	/** Out of the trash for good (the platform keeps a recoverable copy for administrators). */
	const deletePage = useCallback(
		async (pageId: string, strategy: TDocumentDeleteStrategy = 'subtree') => {
			await docsService.remove(pageId, strategy);
			queryClient.removeQueries({ queryKey: queryKeys.docs.page(tenantId, pageId) });
			await Promise.all([invalidateTree(), invalidateTrash()]);
		},
		[invalidateTrash, invalidateTree, queryClient, tenantId]
	);

	/** Into another space (the organization's, a team's, the reader's private one), with the sub-pages they may write. */
	const moveToSpace = useCallback(
		async (pageId: string, visibility: EDocumentVisibility, organizationTeamId: string | null = null) => {
			const page = await docsService.moveToSpace(pageId, {
				visibility,
				organizationTeamId: visibility === EDocumentVisibility.TEAM ? organizationTeamId : null,
				applyToSubtree: true
			});
			putPage(page);
			// The sub-pages moved with it.
			await invalidateTree();
			return page;
		},
		[invalidateTree, putPage]
	);

	const restoreVersion = useCallback(
		async (pageId: string, versionId: string) => {
			const page = await docsService.restoreVersion(pageId, versionId);
			queryClient.setQueryData<IDocumentPage>(queryKeys.docs.page(tenantId, pageId), page);
			putPage(page);
			await queryClient.invalidateQueries({ queryKey: queryKeys.docs.versions(tenantId, pageId) });
			return page;
		},
		[putPage, queryClient, tenantId]
	);

	const invalidateProjectPages = useCallback(
		(projectId: string) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.docs.projectPages(tenantId, organizationId, projectId) }),
				organizationId
					? queryClient.invalidateQueries({ queryKey: queryKeys.entityFiles.byEntity(organizationId, 'OrganizationProject', projectId) })
					: Promise.resolve()
			]),
		[organizationId, queryClient, tenantId]
	);

	/** Shows the page on the project's Docs tab. */
	const attachToProject = useCallback(
		async (pageId: string, projectId: string) => {
			const link = await entityFilesService.linkFile(pageId, { entity: 'OrganizationProject', entityId: projectId });
			await invalidateProjectPages(projectId);
			return link;
		},
		[invalidateProjectPages]
	);

	const detachFromProject = useCallback(
		async (linkId: string, projectId: string) => {
			await entityFilesService.unlinkFile(linkId);
			await invalidateProjectPages(projectId);
		},
		[invalidateProjectPages]
	);

	return {
		createPage,
		updatePage,
		movePage,
		reorderPage,
		duplicatePage,
		trashPage,
		restorePage,
		deletePage,
		restoreVersion,
		moveToSpace,
		attachToProject,
		detachFromProject,
		invalidateTree,
		invalidateTrash
	};
}
