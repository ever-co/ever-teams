import { atom } from 'jotai';

/**
 * The token of a saved report's link, by report id. It is answered once, when the link is turned on or replaced (only
 * its digest is stored), and kept here for the rest of the visit so the author can copy the address again until the
 * page is reloaded; never in the browser's storage.
 */
export const sharedReportLinkTokensState = atom<Readonly<Record<string, string>>>({});
