/** `{ [key]: value }` when the value is there, `{}` otherwise: a field a request sends only when it has one. */
export function optionalField<K extends string, V>(key: K, value: V | null | undefined): Partial<Record<K, V>> {
	const isMissing = value === null || value === undefined || value === '';
	if (isMissing) {
		return {};
	}
	return { [key]: value } as Partial<Record<K, V>>;
}

/** A list of one `{ id }` when the id is there, an empty list otherwise. */
export function idListOf(id: string | null | undefined): { id: string }[] {
	if (!id) {
		return [];
	}
	return [{ id }];
}
