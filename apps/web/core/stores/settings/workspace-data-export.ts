import { atom } from 'jotai';

export type WorkspaceDataExportState = 'idle' | 'exporting' | 'failed';

/**
 * The export of all of the workspace's data in this tab. It outlives the settings page: an export can take minutes,
 * and a page opened again meanwhile shows it running instead of offering a second one.
 */
export const workspaceDataExportState = atom<WorkspaceDataExportState>('idle');
