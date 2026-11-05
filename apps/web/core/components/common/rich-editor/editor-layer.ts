/**
 * Marks the editor's floating menus, which are mounted outside the editor: a surface that closes on an outside click
 * (the quick task card) treats a click in them as its own. Free of editor imports, so that surface stays light.
 */
export const RICH_EDITOR_LAYER_ATTRIBUTE = 'data-rich-editor-layer';

export function isInRichEditorLayer(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}
	const layer = target.closest(`[${RICH_EDITOR_LAYER_ATTRIBUTE}]`);
	return Boolean(layer);
}
