/**
 * The form fields of an import passed on with the zip in proxy mode, each checked: a parent page, or a space (a
 * visibility and the team of a team space). Any other field, or a value of another shape, is dropped; the platform
 * checks the target and the reader's rights.
 */

/** The largest import the proxy reads (the platform's own default limit is 100 MiB), multipart overhead included. */
export const DOCS_IMPORT_PROXY_MAX_BYTES = 256 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISIBILITIES: readonly string[] = ['ORGANIZATION', 'PRIVATE', 'TEAM'];

/** The allowed fields of the incoming form, as Gauzy should receive them. */
export function passedImportFieldsOf(incoming: FormData | null | undefined): Array<[string, string]> {
	const passed: Array<[string, string]> = [];
	const parentId = incoming?.get('parentId');
	if (typeof parentId === 'string' && UUID.test(parentId)) {
		passed.push(['parentId', parentId]);
		// Under a parent the pages take the parent's space: a space beside it would only be refused.
		return passed;
	}
	const visibility = incoming?.get('visibility');
	if (typeof visibility === 'string' && VISIBILITIES.includes(visibility)) passed.push(['visibility', visibility]);
	const teamId = incoming?.get('organizationTeamId');
	if (visibility === 'TEAM' && typeof teamId === 'string' && UUID.test(teamId)) passed.push(['organizationTeamId', teamId]);
	return passed;
}
