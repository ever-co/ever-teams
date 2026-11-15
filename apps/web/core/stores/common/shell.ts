import { atom } from 'jotai';

/**
 * Whether this page load's shell has settled: its critical reads answered (InitState marks `ever-teams:shell-ready`)
 * and a moment passed since, or it never got there within a long while. A read that nothing on the first screen
 * waits for (the sidebar's Goals entry) waits for it: the cold-start budget (startup-performance.cy.ts) counts every
 * Gauzy read that starts before the shell is ready. Once true, it stays true for the page.
 */
export const shellSettledState = atom(false);
