/**
 * The labels field of an entry write (Gauzy #12029): sent only when the API has labels on entries, so an API without
 * them is sent nothing new. Sent empty on purpose, it takes every label off.
 */
export function entryLabelsFieldOf(labelIds: ReadonlyArray<string>, isSupported: boolean): { tags?: string[] } {
	if (!isSupported) {
		return {};
	}
	return { tags: [...labelIds] };
}
