import * as Y from 'yjs';

/** The node and mark types an editor's schema carries. */
export interface DocsLiveSchemaTypes {
	nodes: ReadonlySet<string>;
	marks: ReadonlySet<string>;
}

/**
 * A mark that may overlap itself is stored under `name--<hash of its attributes>` (the naming of the editor's Yjs binding); the type
 * is the part before the hash.
 */
const HASHED_MARK_NAME = /^(.*)--[a-zA-Z0-9+/=]{8}$/;

function markNameOf(attribute: string): string {
	return HASHED_MARK_NAME.exec(attribute)?.[1] ?? attribute;
}

function sortedNames(names: Iterable<string>): string[] {
	return [...names].sort((a, b) => a.localeCompare(b));
}

function collect(found: Set<string>, kind: 'node' | 'mark', name: string, types: DocsLiveSchemaTypes): void {
	const known = kind === 'node' ? types.nodes : types.marks;
	if (!known.has(name)) found.add(name);
}

/**
 * The node and mark types an update adds that the editor does not know. The editor's binding deletes from the shared
 * document whatever it cannot render (for everyone, not only here), so an update that brings such content must never
 * reach a bound editor: the page then gives way to the read-only view, as a stored page of unknown content does.
 *
 * Read from the update itself: every element it inserts is named after its node type, and every format it applies to
 * a text run is named after its mark type.
 *
 * @param update A Yjs update (v1).
 * @param types What the editor's schema carries.
 * @returns The unknown types, sorted; empty when the update is safe to apply.
 */
export function unknownTypesInUpdate(update: Uint8Array, types: DocsLiveSchemaTypes): string[] {
	const found = new Set<string>();
	const { structs } = Y.decodeUpdate(update);
	for (const struct of structs) {
		if (!(struct instanceof Y.Item)) continue;
		const content = struct.content;
		if (content instanceof Y.ContentType) {
			const type = content.type;
			if (type instanceof Y.XmlElement) collect(found, 'node', type.nodeName, types);
		} else if (content instanceof Y.ContentFormat && struct.parentSub === null) {
			collect(found, 'mark', markNameOf(content.key), types);
		}
	}
	return sortedNames(found);
}

/**
 * The node and mark types a shared fragment holds that the editor does not know: checked before an editor is bound
 * to a document it did not see arrive (the first state of a session).
 *
 * @param fragment The fragment the editor would bind to.
 * @param types What the editor's schema carries.
 */
export function unknownTypesInFragment(fragment: Y.XmlFragment, types: DocsLiveSchemaTypes): string[] {
	const found = new Set<string>();
	const visit = (node: Y.XmlElement | Y.XmlText | Y.XmlHook) => {
		if (node instanceof Y.XmlElement) {
			collect(found, 'node', node.nodeName, types);
			for (const child of node.toArray()) visit(child);
		} else if (node instanceof Y.XmlText) {
			for (const insert of node.toDelta() as Array<{ attributes?: Record<string, unknown> }>) {
				for (const attribute of Object.keys(insert.attributes ?? {}))
					collect(found, 'mark', markNameOf(attribute), types);
			}
		}
	};
	for (const child of fragment.toArray()) visit(child);
	return sortedNames(found);
}
