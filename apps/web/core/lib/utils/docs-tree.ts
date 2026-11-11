import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';

/** A page with its sub-pages, as the tree draws it. */
export interface DocTreeNode {
	page: IDocumentPage;
	children: DocTreeNode[];
	depth: number;
}

export interface DocTree {
	roots: DocTreeNode[];
	byId: Map<string, DocTreeNode>;
}

const EMPTY_TREE: DocTree = { roots: [], byId: new Map() };

/** Siblings sort by their index, then by name, then by id, so the order is total and stable. */
export function compareSiblings(a: IDocumentPage, b: IDocumentPage): number {
	const byIndex = (a.index ?? 0) - (b.index ?? 0);
	if (byIndex !== 0) return byIndex;
	const byName = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
	if (byName !== 0) return byName;
	return a.id.localeCompare(b.id);
}

/**
 * The tree of a flat page list. A page whose parent is not in the list (an ancestor the reader may not see, or
 * one in the trash) is shown at the root rather than lost.
 */
export function buildDocTree(pages: readonly IDocumentPage[]): DocTree {
	if (pages.length === 0) return EMPTY_TREE;
	const byId = new Map<string, DocTreeNode>();
	for (const page of pages) {
		byId.set(page.id, { page, children: [], depth: 0 });
	}
	const roots: DocTreeNode[] = [];
	for (const node of byId.values()) {
		const parentId = node.page.parentId ?? null;
		const parent = parentId ? byId.get(parentId) : undefined;
		if (parent && parent !== node) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}
	const sortDeep = (nodes: DocTreeNode[], depth: number) => {
		nodes.sort((a, b) => compareSiblings(a.page, b.page));
		for (const node of nodes) {
			node.depth = depth;
			sortDeep(node.children, depth + 1);
		}
	};
	sortDeep(roots, 0);
	// A cycle (a parent chain that never reaches the root) would keep every node off the roots: surface them.
	const reachable = new Set<string>();
	const visit = (nodes: DocTreeNode[]) => {
		for (const node of nodes) {
			if (reachable.has(node.page.id)) continue;
			reachable.add(node.page.id);
			visit(node.children);
		}
	};
	visit(roots);
	for (const node of byId.values()) {
		if (!reachable.has(node.page.id)) {
			node.depth = 0;
			roots.push(node);
			visit([node]);
		}
	}
	return { roots, byId };
}

/** The rows the tree shows, in reading order, given which pages are expanded. */
export function flattenTree(nodes: readonly DocTreeNode[], expanded: ReadonlySet<string>): DocTreeNode[] {
	const rows: DocTreeNode[] = [];
	const walk = (list: readonly DocTreeNode[]) => {
		for (const node of list) {
			rows.push(node);
			if (node.children.length > 0 && expanded.has(node.page.id)) walk(node.children);
		}
	};
	walk(nodes);
	return rows;
}

/** The ids from the root down to the parent of `id` (not `id` itself). */
export function ancestorIdsOf(tree: DocTree, id: string): string[] {
	const ancestors: string[] = [];
	const seen = new Set<string>([id]);
	let current = tree.byId.get(id)?.page.parentId ?? null;
	while (current && !seen.has(current) && tree.byId.has(current)) {
		ancestors.unshift(current);
		seen.add(current);
		current = tree.byId.get(current)?.page.parentId ?? null;
	}
	return ancestors;
}

/** Every page under `id`, depth first. */
export function descendantIdsOf(tree: DocTree, id: string): string[] {
	const ids: string[] = [];
	const walk = (node: DocTreeNode | undefined) => {
		for (const child of node?.children ?? []) {
			ids.push(child.page.id);
			walk(child);
		}
	};
	walk(tree.byId.get(id));
	return ids;
}

/** A page cannot move under itself or under one of its own sub-pages. */
export function canMoveUnder(tree: DocTree, id: string, targetParentId: string | null): boolean {
	if (targetParentId === null) return true;
	if (targetParentId === id) return false;
	return !descendantIdsOf(tree, id).includes(targetParentId);
}

export function siblingsOf(tree: DocTree, parentId: string | null): DocTreeNode[] {
	if (parentId === null) return tree.roots;
	return tree.byId.get(parentId)?.children ?? [];
}

/** The index a new page takes at the end of its siblings. */
export function nextIndexUnder(tree: DocTree, parentId: string | null): number {
	const siblings = siblingsOf(tree, parentId);
	if (siblings.length === 0) return 0;
	return Math.max(...siblings.map((node) => node.page.index ?? 0)) + 1;
}

/** The sibling ids with `id` moved one step up or down; null when it is already at that end. */
export function reorderedIds(siblingIds: readonly string[], id: string, direction: 'up' | 'down'): string[] | null {
	const at = siblingIds.indexOf(id);
	if (at < 0) return null;
	const to = direction === 'up' ? at - 1 : at + 1;
	if (to < 0 || to >= siblingIds.length) return null;
	const next = [...siblingIds];
	[next[at], next[to]] = [next[to], next[at]];
	return next;
}

/**
 * Private pages are the person's own space, a team's pages (`TEAM`, on a platform with Docs collaboration) its team
 * space; the rest is the workspace. A team page without its team reads as the workspace's.
 */
export function splitSpaces(pages: readonly IDocumentPage[]): { workspace: IDocumentPage[]; privatePages: IDocumentPage[]; teamPages: Map<string, IDocumentPage[]> } {
	const workspace: IDocumentPage[] = [];
	const privatePages: IDocumentPage[] = [];
	const teamPages = new Map<string, IDocumentPage[]>();
	for (const page of pages) {
		if (page.visibility === EDocumentVisibility.PRIVATE) {
			privatePages.push(page);
		} else if (page.visibility === EDocumentVisibility.TEAM && page.organizationTeamId) {
			const team = teamPages.get(page.organizationTeamId) ?? [];
			team.push(page);
			teamPages.set(page.organizationTeamId, team);
		} else {
			workspace.push(page);
		}
	}
	return { workspace, privatePages, teamPages };
}

/** The pages of a list, newest change first. */
export function sortByUpdated(pages: readonly IDocumentPage[]): IDocumentPage[] {
	return [...pages].sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? '') || a.id.localeCompare(b.id));
}

/** The title a row shows; a page without a name reads as untitled. */
export function pageTitle(page: Pick<IDocumentPage, 'name'> | null | undefined, untitled: string): string {
	const name = page?.name?.trim() ?? '';
	return name.length > 0 ? name : untitled;
}

/** Where the arrow keys take the focus in a list of `count` rows; -1 when the key is not a movement. */
export function nextFocusIndex(count: number, current: number, key: string): number {
	if (count <= 0) return -1;
	switch (key) {
		case 'ArrowDown':
			return current < 0 ? 0 : Math.min(count - 1, current + 1);
		case 'ArrowUp':
			return current < 0 ? count - 1 : Math.max(0, current - 1);
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return -1;
	}
}

/** The pages whose name or description holds every word of the query (case-insensitive), for the local filter. */
export function filterPagesLocally(pages: readonly IDocumentPage[], query: string): IDocumentPage[] {
	const words = query
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length > 0);
	if (words.length === 0) return [...pages];
	return pages.filter((page) => {
		const haystack = `${page.name ?? ''} ${page.description ?? ''}`.toLowerCase();
		return words.every((word) => haystack.includes(word));
	});
}
