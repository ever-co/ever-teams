import type { IDocumentPage } from '@/core/types/interfaces/common/docs';

/**
 * Whether the platform says the signed-in person may read this page but not change it: every member reads a
 * workspace page, and only its author, the page's team and the people it is shared with for editing write it.
 * Only an explicit no counts. A platform that predates the answer sends none, and the page stays editable as
 * before: a refused save then says why (#5723).
 */
export function isPageWithoutWriteAccess(page: Pick<IDocumentPage, 'canWrite'>): boolean {
	return page.canWrite === false;
}
