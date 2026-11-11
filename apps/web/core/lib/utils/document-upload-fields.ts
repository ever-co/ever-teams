/**
 * The form fields passed on with the files, each with the values it may take: where the files come from (a chat
 * message's files are `CHAT`), who sees them, and the two per-upload switches of the knowledge pipeline. Any other
 * field, or any other value, is dropped. Gauzy refuses the sources it keeps for itself.
 */
const PASSED_FIELDS: Readonly<Record<string, readonly string[]>> = {
	source: ['UPLOAD', 'CHAT', 'EDITOR'],
	visibility: ['PRIVATE', 'ORGANIZATION'],
	importToKnowledge: ['true', 'false'],
	classifyWithAi: ['true', 'false']
};

/** The allowed fields of the incoming form, as Gauzy should receive them. */
export function passedUploadFieldsOf(incoming: FormData | null | undefined): Array<[string, string]> {
	const passed: Array<[string, string]> = [];
	for (const [name, allowed] of Object.entries(PASSED_FIELDS)) {
		const value = incoming?.get(name);
		if (typeof value === 'string' && allowed.includes(value)) passed.push([name, value]);
	}
	return passed;
}
