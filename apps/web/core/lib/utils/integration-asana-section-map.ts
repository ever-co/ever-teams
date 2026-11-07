import { matchStatusName, type LinearStatusOption } from '@/core/lib/utils/integration-linear-state-map';
import type { IAsanaSection } from '@/core/types/interfaces/integrations/asana';

/** The value of a section field that leaves the section to its name (selects cannot hold an empty value). */
export const SECTION_BY_NAME = '__by_name__';

/** The form's value of a section: the stored status, or "by name" when the map leaves the section out. */
export function sectionFieldValue(sectionMap: Record<string, string>, sectionGid: string): string {
	const value = sectionMap[sectionGid];
	return typeof value === 'string' && value.trim() ? value : SECTION_BY_NAME;
}

/** The map the platform stores from the form's fields: only the sections given a status. */
export function sectionMapOfFields(fields: Record<string, string>): Record<string, string> {
	const map: Record<string, string> = {};
	for (const [gid, value] of Object.entries(fields)) {
		const status = value === SECTION_BY_NAME ? '' : value.trim();
		if (gid && status) map[gid] = status;
	}
	return map;
}

/** The form's fields for a project's sections and a stored map (sections the map names but the project lost are left out). */
export function sectionFieldsOf(sections: readonly IAsanaSection[], sectionMap: Record<string, string>): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const section of sections) fields[section.gid] = sectionFieldValue(sectionMap, section.gid);
	return fields;
}

/** The sections whose chosen status names no status of the project or the organization (a value left to the name is always fine). */
export function invalidSectionFields(fields: Record<string, string>, options: readonly LinearStatusOption[]): string[] {
	return Object.entries(fields)
		.filter(([, value]) => value !== SECTION_BY_NAME && !matchStatusName(value, options))
		.map(([gid]) => gid);
}
