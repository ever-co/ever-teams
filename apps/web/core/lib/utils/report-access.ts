/**
 * Gauzy reads the time log reports, and the saved reports that describe them, for a role holding one of these: a
 * holder who may not act for other employees reads their own time only.
 */
const TIME_LOG_REPORT_PERMISSIONS: ReadonlyArray<string> = ['TIME_TRACKER', 'ALL_ORG_EDIT', 'ALL_ORG_VIEW'];

/** Whether the role reads time log reports, its own time at least. */
export function readsTimeLogReports(permissions: ReadonlyArray<string>): boolean {
	return TIME_LOG_REPORT_PERMISSIONS.some((permission) => permissions.includes(permission));
}
