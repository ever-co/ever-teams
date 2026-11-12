/**
 * The pages the sidebar links to, as one flat list for whoever lists them elsewhere (the command palette's "Go to").
 * Read from the entries the sidebar itself renders, so a page it hides from someone is not here either. Pure.
 */

export interface SidebarPage {
	title: string;
	url: string;
	/** The sidebar group the page sits under ("Reports"); none for a page of the first level. */
	section?: string;
}

/** An entry of the sidebar, as far as its link goes. */
export interface SidebarLink {
	title: string;
	url: string;
}

/** A row under a group. */
export interface SidebarRow extends SidebarLink {
	/** Drawn by its own component (a caption, an empty note, a "create" row): not a link to a page. */
	component?: unknown;
	/** Carries its own menu or button: a record of the workspace (a project, a favourite), not a page of the app. */
	actions?: unknown;
}

export interface SidebarGroup extends SidebarLink {
	/** Whether the group's own row is a link when it also has rows; without rows it always is. */
	selectable?: boolean;
	items?: readonly SidebarRow[];
}

/** The url of an entry that leads nowhere by itself: a group that only opens its rows, a caption. */
const NO_PAGE_URL = '#';

function isLink(entry: SidebarLink): boolean {
	const hasTitle = entry.title.trim().length > 0;
	const hasUrl = entry.url.length > 0;
	const leadsSomewhere = entry.url !== NO_PAGE_URL;
	return hasTitle && hasUrl && leadsSomewhere;
}

function isPageRow(row: SidebarRow): boolean {
	const isDrawnByComponent = Boolean(row.component);
	const isRecord = Boolean(row.actions);
	if (isDrawnByComponent || isRecord) {
		return false;
	}
	return isLink(row);
}

/** The sidebar draws a group's own row as a link when the group has no rows, or says it is selectable. */
function isGroupItsOwnPage(group: SidebarGroup, hasRows: boolean): boolean {
	if (!isLink(group)) {
		return false;
	}
	if (!hasRows) {
		return true;
	}
	return group.selectable === true;
}

function pagesOfGroup(group: SidebarGroup): SidebarPage[] {
	const rows = group.items ?? [];
	const hasRows = rows.length > 0;
	const pages: SidebarPage[] = [];
	if (isGroupItsOwnPage(group, hasRows)) {
		pages.push({ title: group.title, url: group.url });
	}
	for (const row of rows) {
		if (isPageRow(row)) {
			pages.push({ title: row.title, url: row.url, section: group.title });
		}
	}
	return pages;
}

/**
 * The pages of the sidebar in its own order: the first-level links, then each group's pages under the group's name.
 * A record listed under a group (a project, a favourite task) is not a page: the palette finds those by searching.
 */
export function sidebarPagesOf(links: readonly SidebarLink[], groups: readonly SidebarGroup[]): SidebarPage[] {
	const pages: SidebarPage[] = [];
	for (const link of links) {
		if (isLink(link)) {
			pages.push({ title: link.title, url: link.url });
		}
	}
	for (const group of groups) {
		pages.push(...pagesOfGroup(group));
	}
	return pages;
}
